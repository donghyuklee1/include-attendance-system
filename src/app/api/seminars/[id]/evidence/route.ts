import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { createClient } from '@/utils/supabase/server';
import {
  getOrCreateFolder,
  uploadFileToGoogleDrive,
  generateFolderName,
  listFilesInFolder,
} from '@/utils/google-drive';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: seminarId } = await params;

    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get seminar details
    const { data: seminar, error: seminarError } = await supabase
      .from('seminars')
      .select('id, title, owner_id')
      .eq('id', seminarId)
      .single();

    if (seminarError || !seminar) {
      return NextResponse.json(
        { error: 'Seminar not found' },
        { status: 404 }
      );
    }

    // Check if user is the seminar owner
    if (seminar.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Permission denied. Only seminar owner can manage evidence' },
        { status: 403 }
      );
    }

    const googleDriveFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!googleDriveFolderId) {
      return NextResponse.json(
        { error: 'Google Drive configuration is missing' },
        { status: 500 }
      );
    }

    // 조회 시점의 날짜 기준 폴더 (매주 활동별 증빙 구분)
    const evidenceDate = new Date();
    const folderName = generateFolderName(seminar.title, evidenceDate);

    console.log(`📁 Creating/updating Google Drive folder: ${folderName}`);

    // Get or create evidence folder
    const evidenceFolderId = await getOrCreateFolder(
      googleDriveFolderId,
      folderName
    );

    // List files in the folder
    const files = await listFilesInFolder(evidenceFolderId);

    return NextResponse.json({
      success: true,
      message: '증빙자료 폴더가 생성/조회되었습니다',
      data: {
        seminarId,
        seminarTitle: seminar.title,
        folderName,
        folderId: evidenceFolderId,
        googleDriveLink: `https://drive.google.com/drive/folders/${evidenceFolderId}`,
        files: files.map(f => ({
          id: f.id,
          name: f.name,
          link: f.webViewLink,
        })),
        fileCount: files.length,
      },
    });
  } catch (error) {
    console.error('❌ Error managing evidence folder:', error);

    return NextResponse.json(
      {
        error: 'Failed to manage evidence folder',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET: Get existing evidence folder
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: seminarId } = await params;

    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get seminar details
    const { data: seminar, error: seminarError } = await supabase
      .from('seminars')
      .select('id, title, owner_id')
      .eq('id', seminarId)
      .single();

    if (seminarError || !seminar) {
      return NextResponse.json(
        { error: 'Seminar not found' },
        { status: 404 }
      );
    }

    // Check if user is the seminar owner
    if (seminar.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Permission denied. Only seminar owner can view evidence' },
        { status: 403 }
      );
    }

    const googleDriveFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!googleDriveFolderId) {
      return NextResponse.json(
        { error: 'Google Drive configuration is missing' },
        { status: 500 }
      );
    }

    // 조회 시점의 날짜 기준 폴더 (매주 활동별 증빙 구분)
    const evidenceDate = new Date();
    const folderName = generateFolderName(seminar.title, evidenceDate);

    // Get evidence folder
    const evidenceFolderId = await getOrCreateFolder(
      googleDriveFolderId,
      folderName
    );

    // List files in the folder
    const files = await listFilesInFolder(evidenceFolderId);

    return NextResponse.json({
      success: true,
      data: {
        seminarId,
        seminarTitle: seminar.title,
        folderName,
        folderId: evidenceFolderId,
        googleDriveLink: `https://drive.google.com/drive/folders/${evidenceFolderId}`,
        files: files.map(f => ({
          id: f.id,
          name: f.name,
          link: f.webViewLink,
        })),
        fileCount: files.length,
      },
    });
  } catch (error) {
    console.error('❌ Error retrieving evidence folder:', error);

    return NextResponse.json(
      {
        error: 'Failed to retrieve evidence folder',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
