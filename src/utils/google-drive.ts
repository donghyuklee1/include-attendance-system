import { google } from 'googleapis';

/**
 * Google Drive integration (Service Account).
 *
 * IMPORTANT: Service accounts do NOT have their own storage quota.
 * Set GOOGLE_DRIVE_FOLDER_ID to one of:
 * 1. A folder inside a Shared Drive where the service account is a member (recommended).
 * 2. A folder in a real user's "My Drive" that has been shared with the service account (Editor).
 * See: https://support.google.com/a/answer/7281227
 */

function getServiceAccountKey() {
  const serviceAccountKeyStr = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKeyStr) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable is not set');
  }
  let keyJsonStr = String(serviceAccountKeyStr);
  if (!keyJsonStr.trim().startsWith('{')) {
    keyJsonStr = Buffer.from(keyJsonStr, 'base64').toString('utf-8');
  }
  return JSON.parse(keyJsonStr);
}

function getAuth() {
  const serviceAccountKey = getServiceAccountKey();
  if (serviceAccountKey?.client_email) {
    console.log('🔐 Using Google service account:', serviceAccountKey.client_email);
  }
  return new google.auth.GoogleAuth({
    credentials: serviceAccountKey,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
}

// Initialize Google Drive API with service account
export function getGoogleDriveClient() {
  try {
    const auth = getAuth();
    return google.drive({ version: 'v3', auth });
  } catch (error) {
    console.error('❌ Error initializing Google Drive client:', error);
    throw new Error('Failed to initialize Google Drive client');
  }
}

// Create or get folder in Google Drive
export async function getOrCreateFolder(
  parentFolderId: string,
  folderName: string
): Promise<string> {
  const drive = getGoogleDriveClient();

  try {
    // Search for existing folder (supportsAllDrives for Shared Drive)
    const response = await drive.files.list({
      q: `'${parentFolderId}' in parents and name='${folderName}' and trashed=false and mimeType='application/vnd.google-apps.folder'`,
      spaces: 'drive',
      fields: 'files(id, name)',
      pageSize: 1,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    if (response.data.files && response.data.files.length > 0) {
      console.log(`✅ Found existing folder: ${folderName}`);
      return response.data.files[0].id!;
    }

    // Create new folder if it doesn't exist
    console.log(`📁 Creating new folder: ${folderName}`);
    const createResponse = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId],
      },
      fields: 'id',
      supportsAllDrives: true,
    });

    if (!createResponse.data.id) {
      throw new Error('Failed to create folder');
    }

    console.log(`✅ Created folder: ${folderName} (ID: ${createResponse.data.id})`);
    return createResponse.data.id;
  } catch (error) {
    console.error('❌ Error managing folder:', error);
    throw new Error('Failed to manage Google Drive folder');
  }
}

// Upload file to Google Drive (resumable upload: 5MB 제한 없음, Shared Drive에서도 안정적)
export async function uploadFileToGoogleDrive(
  parentFolderId: string,
  fileName: string,
  fileContent: Buffer,
  mimeType: string = 'image/jpeg'
): Promise<{ id: string; webViewLink?: string }> {
  try {
    console.log(`📤 Uploading file: ${fileName} to folder: ${parentFolderId} (resumable)`);
    const auth = getAuth();
    const authClient = await auth.getClient();
    const tokenResponse = await authClient.getAccessToken();
    const token = tokenResponse.token;
    if (!token) {
      throw new Error('Failed to get access token for Drive upload');
    }

    // 1) Start resumable session (Shared Drive 지원 쿼리 포함)
    const initUrl = new URL('https://www.googleapis.com/upload/drive/v3/files');
    initUrl.searchParams.set('uploadType', 'resumable');
    initUrl.searchParams.set('supportsAllDrives', 'true');
    initUrl.searchParams.set('fields', 'id, webViewLink');

    const initRes = await fetch(initUrl.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        name: fileName,
        parents: [parentFolderId],
      }),
    });

    if (!initRes.ok) {
      const errBody = await initRes.text();
      let errMsg = `Drive upload init failed: ${initRes.status} ${initRes.statusText}`;
      try {
        const errJson = JSON.parse(errBody);
        errMsg = errJson.error?.message || errBody || errMsg;
      } catch {
        if (errBody) errMsg += ` - ${errBody}`;
      }
      throw new Error(errMsg);
    }

    const location = initRes.headers.get('Location');
    if (!location) {
      throw new Error('Drive resumable upload: no Location header');
    }

    // 2) Upload file content in one request
    const size = fileContent.length;
    const uploadRes = await fetch(location, {
      method: 'PUT',
      headers: {
        'Content-Length': String(size),
        'Content-Range': `bytes 0-${size - 1}/${size}`,
        'Content-Type': mimeType,
      },
      body: fileContent,
    });

    if (!uploadRes.ok) {
      const errBody = await uploadRes.text();
      let errMsg = `Drive file upload failed: ${uploadRes.status} ${uploadRes.statusText}`;
      try {
        const errJson = JSON.parse(errBody);
        errMsg = errJson.error?.message || errBody || errMsg;
      } catch {
        if (errBody) errMsg += ` - ${errBody}`;
      }
      throw new Error(errMsg);
    }

    const fileData = (await uploadRes.json()) as { id?: string; webViewLink?: string };
    if (!fileData.id) {
      throw new Error('Failed to upload file: no id in response');
    }

    console.log(`✅ Uploaded file: ${fileName} (ID: ${fileData.id})`);
    return { id: fileData.id, webViewLink: fileData.webViewLink };
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('❌ Error uploading file:', { message: err.message, stack: err.stack });
    throw err;
  }
}

// Generate folder name for seminar evidence (format: "세미나명_YYYYMMDD", 날짜 = 증빙 제출/조회 시점, 한국 시간 기준)
export function generateFolderName(seminarTitle: string, date: Date = new Date()): string {
  // 서버가 UTC일 수 있으므로 한국(Asia/Seoul) 기준 날짜로 포맷
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateStr = formatter.format(date).replace(/-/g, '');
  return `${seminarTitle}_${dateStr}`;
}

// Get list of files in a folder
export async function listFilesInFolder(folderId: string): Promise<Array<{ id: string; name: string; webViewLink?: string }>> {
  const drive = getGoogleDriveClient();

  try {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      spaces: 'drive',
      fields: 'files(id, name, webViewLink)',
      pageSize: 100,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    return (response.data.files || []).map(file => ({
      id: file.id || '',
      name: file.name || '',
      webViewLink: file.webViewLink || undefined,
    }));
  } catch (error) {
    console.error('❌ Error listing files:', error);
    throw new Error('Failed to list files from Google Drive');
  }
}
