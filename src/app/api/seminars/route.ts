import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { sendSeminarCreatedNotification } from '@/lib/notifications';
import { createSeminarFolderInDrive } from '@/lib/google-drive';
import type { Database } from '@/types/database';

type SeminarRow = Database['public']['Tables']['seminars']['Row'];
type SeminarInsert = Database['public']['Tables']['seminars']['Insert'];

export async function GET(request: NextRequest) {
  try {
    // Create Supabase client - will be authenticated if user has valid session
    const supabase = await createClient();
    
    // Get current user to check enrollment status
    const { data: { user } } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const tags = searchParams.get('tags');

    let query = supabase
      .from('seminars')
      .select(`
        *,
        users!owner_id (
          name,
          email
        ),
        semesters (
          name,
          is_active
        ),
        enrollments (
          id,
          user_id,
          status
        ),
        sessions (
          id
        )
      `);

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%, description.ilike.%${search}%`);
    }

    if (tags) {
      const tagsArray = tags.split(',');
      query = query.contains('tags', tagsArray);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching seminars:', error);
      return NextResponse.json({ error: 'Failed to fetch seminars' }, { status: 500 });
    }

    // Transform data to match frontend expectations
    type SeminarWithRelations = SeminarRow & {
      users?: { name?: string; email?: string } | null;
      semesters?: { name?: string } | null;
      enrollments?: Array<{ user_id?: string; status?: string; applied_at?: string }>;
      sessions?: Array<{ id?: string }>;
    };
    const transformedSeminars = (data as SeminarWithRelations[] | null)?.map(seminar => {
      const currentUserEnrollment = user ?
        seminar.enrollments?.find((e) => e.user_id === user.id) : null;
      return {
        id: seminar.id,
        title: seminar.title,
        description: seminar.description,
        instructor: seminar.users?.name || 'Unknown',
        startDate: seminar.start_date,
        endDate: seminar.end_date,
        capacity: seminar.capacity || 0,
        enrolled: seminar.enrollments?.filter((e) => e.status === 'approved').length || 0,
        location: seminar.location,
        tags: seminar.tags || [],
        status: seminar.status,
        sessions: seminar.sessions?.length || 0,
        semester: seminar.semesters?.name || 'Unknown',
        applicationStart: seminar.application_start,
        applicationEnd: seminar.application_end,
        currentUserEnrollment: currentUserEnrollment ? {
          status: currentUserEnrollment.status,
          applied_at: currentUserEnrollment.applied_at
        } : null,
      };
    }) || [];

    return NextResponse.json(transformedSeminars);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from session (handled by middleware)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const data = await request.json();

    // Get semester_id from the request
    const semesterId = data.semester_id;
    if (!semesterId) {
      return NextResponse.json({ error: 'Semester ID is required' }, { status: 400 });
    }

    const { data: semester, error: semesterError } = await supabase
      .from('semesters')
      .select('id, name, is_active')
      .eq('id', semesterId)
      .single();

    if (semesterError || !semester) {
      console.error('Semester not found:', semesterError);
      return NextResponse.json({ error: 'Invalid semester selected. Please contact admin.' }, { status: 400 });
    }

    const semesterData = semester as { name: string; is_active: boolean };
    console.log('🎯 Creating new seminar:', {
      title: data.title,
      owner: user.id,
      semester: semesterData.name,
      isActiveSemester: semesterData.is_active
    });

    const insertData: SeminarInsert = {
      title: data.title,
      description: data.description,
      capacity: data.capacity,
      start_date: data.start_date || data.startDate,
      end_date: data.end_date || data.endDate,
      location: data.location ?? null,
      external_url: data.external_url || data.externalUrl || null,
      owner_id: user.id,
      semester_id: semesterId,
      status: 'draft',
      application_start: data.application_start || data.applicationStart,
      application_end: data.application_end || data.applicationEnd,
      tags: data.tags || [],
    };

    // eslint-disable-next-line
    const { data: seminar, error } = await supabase
      .from('seminars')
      .insert(insertData as any)
      .select()
      .single();

    if (error) {
      console.error('Error creating seminar:', error);
      return NextResponse.json({ error: 'Failed to create seminar' }, { status: 500 });
    }

    const seminarData = seminar as SeminarRow;
    console.log('✅ Seminar created successfully:', seminarData.id);

    if (process.env.GOOGLE_DRIVE_FOLDER_ID && process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      try {
        const folderId = await createSeminarFolderInDrive(seminarData.title);
        await supabase.from('seminars').update({ google_drive_folder_id: folderId }).eq('id', seminarData.id);
        console.log('✅ Google Drive folder created for seminar:', seminarData.title);
      } catch (driveError) {
        console.warn('⚠️ Failed to create Google Drive folder (seminar still created):', driveError);
      }
    }

    const enrollmentData = {
      user_id: user.id,
      seminar_id: seminarData.id,
      status: 'approved' as const,
      applied_at: new Date().toISOString(),
      approved_at: new Date().toISOString(),
      approved_by: user.id,
      notes: 'Automatically enrolled as seminar creator'
    };
    const { error: enrollmentError } = await supabase
      .from('enrollments')
      .insert(enrollmentData as any);

    if (enrollmentError) {
      console.warn('Warning: Failed to auto-enroll creator:', enrollmentError);
      // Don't fail the seminar creation if enrollment fails - just log it
    } else {
      console.log('✅ Creator automatically enrolled in seminar');
    }

    try {
      const { data: userProfile } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', user.id)
        .single();

      const profile = userProfile as { name?: string; email?: string } | null;
      const ownerName = profile?.name || profile?.email?.split('@')[0] || '익명';

      await sendSeminarCreatedNotification(
        seminarData.id,
        seminarData.title,
        ownerName,
        seminarData.description || ''
      );
    } catch (notificationError) {
      console.error('Failed to send seminar creation notification:', notificationError);
      // Don't fail the seminar creation if notification fails
    }

    return NextResponse.json({ seminar: seminarData });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 