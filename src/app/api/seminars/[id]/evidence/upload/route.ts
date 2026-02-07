import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getOrCreateFolder, uploadFileToGoogleDrive, generateFolderName, listFilesInFolder } from '@/utils/google-drive';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: seminarId } = await params;

    // Authenticate user via server client (reads cookies)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get seminar and permission
    const { data: seminar, error: seminarError } = await supabase
      .from('seminars')
      .select('id, title, owner_id, start_date')
      .eq('id', seminarId)
      .single();

    if (seminarError || !seminar) {
      return NextResponse.json({ error: 'Seminar not found' }, { status: 404 });
    }

    if (seminar.owner_id !== user.id) {
      return NextResponse.json({ error: 'Permission denied. Only seminar owner can upload evidence' }, { status: 403 });
    }

    const googleDriveFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!googleDriveFolderId) {
      return NextResponse.json({ error: 'Google Drive configuration is missing' }, { status: 500 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const evidenceDate = seminar.start_date ? new Date(seminar.start_date) : new Date();
    const folderName = generateFolderName(seminar.title, evidenceDate);

    // Ensure folder exists
    const evidenceFolderId = await getOrCreateFolder(googleDriveFolderId, folderName);

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const filename = `${seminar.title.replace(/[^a-zA-Z0-9-_\s\.]/g, '')}_${Date.now()}_${file.name}`;

    const uploadResult = await uploadFileToGoogleDrive(evidenceFolderId, filename, buffer, file.type || 'application/octet-stream');

    // List updated files
    const files = await listFilesInFolder(evidenceFolderId);

    return NextResponse.json({
      success: true,
      data: {
        fileId: uploadResult.id,
        fileLink: uploadResult.webViewLink ? uploadResult.webViewLink : `https://drive.google.com/file/d/${uploadResult.id}/view`,
        folderId: evidenceFolderId,
        files,
        fileCount: files.length,
      },
    });
  } catch (error) {
    console.error('❌ Error uploading evidence file:', error);
    return NextResponse.json({ error: 'Failed to upload file', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
