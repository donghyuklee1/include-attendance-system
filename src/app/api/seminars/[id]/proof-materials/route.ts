import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { uploadProofMaterial } from '@/lib/google-drive';
import { UPLOAD_CONFIG, ERROR_MESSAGES } from '@/config/constants';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: seminarId } = await params;

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // Fetch seminar and verify manager permission
    const { data: seminar, error: seminarError } = await supabase
      .from('seminars')
      .select('id, title, start_date, owner_id, google_drive_folder_id')
      .eq('id', seminarId)
      .single();

    if (seminarError || !seminar) {
      return NextResponse.json({ error: '세미나를 찾을 수 없습니다.' }, { status: 404 });
    }

    const { data: userRecord } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isOwner = seminar.owner_id === user.id;
    const isAdmin = userRecord?.role === 'admin';
    const canManage = isOwner || isAdmin;

    if (!canManage) {
      return NextResponse.json(
        { error: '세미나 증빙 자료 업로드 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // Check Google Drive configuration
    if (!process.env.GOOGLE_DRIVE_FOLDER_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      return NextResponse.json(
        { error: 'Google Drive 연동이 설정되지 않았습니다. 관리자에게 문의하세요.' },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: '업로드할 파일을 선택해주세요.' },
        { status: 400 }
      );
    }

    const results: { name: string; webViewLink: string; error?: string }[] = [];
    const seminarDate = seminar.start_date;

    for (const file of files) {
      if (!(file instanceof File) || file.size === 0) continue;

      // Validate file size
      if (file.size > UPLOAD_CONFIG.maxFileSize) {
        results.push({
          name: file.name,
          webViewLink: '',
          error: ERROR_MESSAGES.validation.fileTooLarge,
        });
        continue;
      }

      // Validate file type
      if (!(UPLOAD_CONFIG.allowedTypes as readonly string[]).includes(file.type)) {
        results.push({
          name: file.name,
          webViewLink: '',
          error: ERROR_MESSAGES.validation.invalidFileType,
        });
        continue;
      }

      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const result = await uploadProofMaterial({
          seminarTitle: seminar.title,
          seminarDate,
          file: buffer,
          fileName: file.name,
          mimeType: file.type,
          targetFolderId: seminar.google_drive_folder_id ?? undefined,
        });

        results.push({
          name: result.name,
          webViewLink: result.webViewLink,
        });
      } catch (err) {
        console.error('Google Drive upload error:', err);
        results.push({
          name: file.name,
          webViewLink: '',
          error: err instanceof Error ? err.message : '업로드에 실패했습니다.',
        });
      }
    }

    const successCount = results.filter((r) => !r.error).length;
    const failCount = results.filter((r) => r.error).length;

    return NextResponse.json({
      success: true,
      message: `${successCount}개 파일이 Google Drive에 업로드되었습니다.${failCount > 0 ? ` (${failCount}개 실패)` : ''}`,
      results,
    });
  } catch (error) {
    console.error('Proof materials upload API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
