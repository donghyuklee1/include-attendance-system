import { google } from 'googleapis';
import { Readable } from 'stream';

/**
 * Google Drive integration (Service Account).
 *
 * IMPORTANT: Service accounts do NOT have their own storage quota.
 * Set GOOGLE_DRIVE_FOLDER_ID to one of:
 * 1. A folder inside a Shared Drive where the service account is a member (recommended).
 * 2. A folder in a real user's "My Drive" that has been shared with the service account (Editor).
 * See: https://support.google.com/a/answer/7281227
 */

// Initialize Google Drive API with service account
export function getGoogleDriveClient() {
  const serviceAccountKeyStr = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  
  if (!serviceAccountKeyStr) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable is not set');
  }

  try {
    // Detect whether the env value is raw JSON or base64-encoded JSON
    let keyJsonStr = String(serviceAccountKeyStr);
    if (!keyJsonStr.trim().startsWith('{')) {
      // assume base64
      keyJsonStr = Buffer.from(keyJsonStr, 'base64').toString('utf-8');
    }
    const serviceAccountKey = JSON.parse(keyJsonStr);
    // Log client email to help diagnose folder sharing/permission issues
    if (serviceAccountKey?.client_email) {
      console.log('🔐 Using Google service account:', serviceAccountKey.client_email);
    }

    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountKey,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

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

// Upload file to Google Drive
export async function uploadFileToGoogleDrive(
  parentFolderId: string,
  fileName: string,
  fileContent: Buffer,
  mimeType: string = 'image/jpeg'
): Promise<{ id: string; webViewLink?: string }> {
  const drive = getGoogleDriveClient();

  try {
    console.log(`📤 Uploading file: ${fileName} to folder: ${parentFolderId}`);
    
    // Convert Buffer to Readable stream so googleapis can pipe it
    const mediaBody = Buffer.isBuffer(fileContent) ? Readable.from(fileContent) : fileContent as any;

    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [parentFolderId],
      },
      media: {
        mimeType,
        body: mediaBody,
      },
      fields: 'id, webViewLink',
      supportsAllDrives: true,
    });

    if (!response.data.id) {
      throw new Error('Failed to upload file');
    }

    console.log(`✅ Uploaded file: ${fileName} (ID: ${response.data.id})`);
    return { id: response.data.id, webViewLink: response.data.webViewLink || undefined };
  } catch (error: any) {
    console.error('❌ Error uploading file:', {
      message: error?.message,
      code: error?.code,
      errors: error?.errors || undefined,
      stack: error?.stack,
    });
    // rethrow to allow upstream handler to return details
    throw error;
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
