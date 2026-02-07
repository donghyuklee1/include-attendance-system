/**
 * Google Drive API integration for seminar proof materials
 * Uploads files to a designated folder with naming: {seminar_name}_{seminar_date}
 */

import { google } from 'googleapis';
import { Readable } from 'stream';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

export interface UploadProofMaterialOptions {
  seminarTitle: string;
  seminarDate: string;
  file: Buffer | Readable;
  fileName: string;
  mimeType: string;
  /** When set, uploads directly to this folder (e.g. seminar's pre-created folder) */
  targetFolderId?: string;
}

/**
 * Sanitize string for use in file/folder names (safe for Google Drive)
 */
function sanitizeFileName(str: string): string {
  return str
    .replace(/[/\\?%*:|"<>]/g, '')
    .replace(/\s+/g, '_')
    .trim()
    .slice(0, 100) || 'seminar';
}

/**
 * Get authenticated Google Drive client
 */
function getDriveClient() {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!key || !folderId) {
    throw new Error(
      'Google Drive is not configured. Set GOOGLE_SERVICE_ACCOUNT_KEY and GOOGLE_DRIVE_FOLDER_ID in .env.local'
    );
  }

  let credentials: object;
  try {
    credentials = JSON.parse(key) as object;
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY must be valid JSON');
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: SCOPES,
  });

  return { drive: google.drive({ version: 'v3', auth }), folderId };
}

/**
 * Format date for file naming (YYYY-MM-DD)
 */
function formatDateForFileName(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/**
 * Create a new folder in the root Google Drive folder with the seminar name.
 * Used when creating a new seminar.
 */
export async function createSeminarFolderInDrive(seminarTitle: string): Promise<string> {
  const { drive, folderId } = getDriveClient();
  const folderName = sanitizeFileName(seminarTitle) || 'seminar';

  const { data: folder } = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [folderId],
    },
    fields: 'id',
  });

  if (!folder.id) {
    throw new Error('Failed to create seminar folder in Google Drive');
  }

  return folder.id;
}

/**
 * Find or create a subfolder for the seminar (legacy: when no targetFolderId)
 * Folder name: {seminar_name}_{seminar_date}
 */
async function getOrCreateSeminarFolder(
  drive: ReturnType<typeof google.drive>,
  parentFolderId: string,
  seminarTitle: string,
  seminarDate: string
): Promise<string> {
  const folderName = `${sanitizeFileName(seminarTitle)}_${formatDateForFileName(seminarDate)}`;

  // List folders in parent and find by name (avoids query escaping issues)
  const { data: list } = await drive.files.list({
    q: `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  const existing = list.files?.find((f) => f.name === folderName);
  if (existing?.id) {
    return existing.id;
  }

  // Create new folder
  const { data: folder } = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    },
    fields: 'id',
  });

  if (!folder.id) {
    throw new Error('Failed to create seminar folder in Google Drive');
  }

  return folder.id;
}

/**
 * Upload a proof material file to Google Drive
 * File naming: {seminar_name}_{seminar_date}_{index}.{ext}
 */
export async function uploadProofMaterial(
  options: UploadProofMaterialOptions
): Promise<{ fileId: string; webViewLink: string; name: string }> {
  const { drive, folderId } = getDriveClient();

  const dateStr = formatDateForFileName(options.seminarDate);
  const baseName = sanitizeFileName(options.seminarTitle);
  const ext = options.fileName.includes('.')
    ? options.fileName.split('.').pop() || 'bin'
    : 'bin';

  // Use pre-created seminar folder if provided, else create/find subfolder
  let seminarFolderId: string;
  if (options.targetFolderId) {
    seminarFolderId = options.targetFolderId;
  } else {
    seminarFolderId = await getOrCreateSeminarFolder(
      drive,
      folderId,
      options.seminarTitle,
      options.seminarDate
    );
  }

  // Generate unique file name (with timestamp to avoid collisions)
  const timestamp = Date.now();
  const safeFileName = `${baseName}_${dateStr}_${timestamp}.${ext}`;

  const fileBuffer =
    options.file instanceof Buffer
      ? options.file
      : Buffer.from(await streamToBuffer(options.file as Readable));

  const { data: file } = await drive.files.create({
    requestBody: {
      name: safeFileName,
      parents: [seminarFolderId],
    },
    media: {
      mimeType: options.mimeType,
      body: Readable.from(fileBuffer),
    },
    fields: 'id, name, webViewLink',
  });

  if (!file.id) {
    throw new Error('Failed to upload file to Google Drive');
  }

  return {
    fileId: file.id,
    webViewLink: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
    name: file.name || safeFileName,
  };
}

function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}
