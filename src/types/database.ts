export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          role: 'admin' | 'member';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name: string;
          role?: 'admin' | 'member';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          role?: 'admin' | 'member';
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          user_id: string;
          nickname: string | null;
          department: string | null;
          student_id: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          nickname?: string | null;
          department?: string | null;
          student_id?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          nickname?: string | null;
          department?: string | null;
          student_id?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      semesters: {
        Row: {
          id: string;
          name: string;
          start_date: string;
          end_date: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          start_date: string;
          end_date: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          start_date?: string;
          end_date?: string;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      seminars: {
        Row: {
          id: string;
          title: string;
          description: string;
          capacity: number;
          semester_id: string;
          owner_id: string;
          start_date: string;
          end_date: string | null;
          location: string | null;
          tags: string[];
          status: 'draft' | 'recruiting' | 'in_progress' | 'completed' | 'cancelled';
          application_start: string;
          application_end: string;
          external_url: string | null;
          google_drive_folder_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          capacity: number;
          semester_id: string;
          owner_id: string;
          start_date: string;
          end_date?: string | null;
          location?: string | null;
          tags?: string[];
          status?: 'draft' | 'recruiting' | 'in_progress' | 'completed' | 'cancelled';
          application_start: string;
          application_end: string;
          external_url?: string | null;
          google_drive_folder_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string;
          capacity?: number;
          semester_id?: string;
          start_date?: string;
          end_date?: string | null;
          location?: string | null;
          tags?: string[];
          status?: 'draft' | 'recruiting' | 'in_progress' | 'completed' | 'cancelled';
          application_start?: string;
          application_end?: string;
          external_url?: string | null;
          google_drive_folder_id?: string | null;
          updated_at?: string;
        };
      };
      sessions: {
        Row: {
          id: string;
          seminar_id: string;
          title: string;
          description: string | null;
          date: string;
          duration_minutes: number;
          location: string | null;
          external_url: string | null;
          status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          seminar_id: string;
          title: string;
          description?: string | null;
          date: string;
          duration_minutes: number;
          location?: string | null;
          external_url?: string | null;
          status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
  
          title?: string;
          description?: string | null;
          date?: string;
          duration_minutes?: number;
          location?: string | null;
          external_url?: string | null;
          status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
          updated_at?: string;
        };
      };
      enrollments: {
        Row: {
          id: string;
          user_id: string;
          seminar_id: string;
          status: 'pending' | 'approved' | 'rejected' | 'cancelled';
          applied_at: string;
          approved_at: string | null;
          approved_by: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          seminar_id: string;
          status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
          applied_at?: string;
          approved_at?: string | null;
          approved_by?: string | null;
          notes?: string | null;
        };
        Update: {
          status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
          approved_at?: string | null;
          approved_by?: string | null;
          notes?: string | null;
        };
      };
      attendances: {
        Row: {
          id: string;
          user_id: string;
          session_id: string;
          status: 'present' | 'absent' | 'late' | 'excused';
          checked_at: string | null;
          checked_by: string | null;
          notes: string | null;
          qr_code: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_id: string;
          status?: 'present' | 'absent' | 'late' | 'excused';
          checked_at?: string | null;
          checked_by?: string | null;
          notes?: string | null;
          qr_code?: string | null;
        };
        Update: {
          status?: 'present' | 'absent' | 'late' | 'excused';
          checked_at?: string | null;
          checked_by?: string | null;
          notes?: string | null;
          qr_code?: string | null;
        };
      };
      qr_codes: {
        Row: {
          id: string;
          session_id: string;
          seminar_id: string;
          qr_code: string;
          numeric_code: string;
          expires_at: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          seminar_id: string;
          qr_code: string;
          numeric_code: string;
          expires_at: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          session_id?: string;
          seminar_id?: string;
          qr_code?: string;
          numeric_code?: string;
          expires_at?: string;
          created_by?: string;
          created_at?: string;
        };
      };
      announcements: {
        Row: {
          id: string;
          seminar_id: string | null;
          title: string;
          content: string;
          is_global: boolean;
          is_pinned: boolean;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          seminar_id?: string | null;
          title: string;
          content: string;
          is_global?: boolean;
          is_pinned?: boolean;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          content?: string;
          is_global?: boolean;
          is_pinned?: boolean;
          updated_at?: string;
        };
      };
      comments: {
        Row: {
          id: string;
          seminar_id: string;
          user_id: string;
          content: string;
          parent_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          seminar_id: string;
          user_id: string;
          content: string;
          parent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          content?: string;
          updated_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: 'enrollment_approved' | 'enrollment_rejected' | 'session_reminder' | 'seminar_updated' | 'announcement' | 'attendance_marked';
          read_at: string | null;
          created_at: string;
          seminar_id: string | null;
          session_id: string | null;
          enrollment_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          type: 'enrollment_approved' | 'enrollment_rejected' | 'session_reminder' | 'seminar_updated' | 'announcement' | 'attendance_marked';
          read_at?: string | null;
          created_at?: string;
          seminar_id?: string | null;
          session_id?: string | null;
          enrollment_id?: string | null;
        };
        Update: {
          read_at?: string | null;
        };
      };
      seminar_permissions: {
        Row: {
          id: string;
          seminar_id: string;
          user_id: string;
          role: 'assistant' | 'moderator';
          granted_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          seminar_id: string;
          user_id: string;
          role: 'assistant' | 'moderator';
          granted_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          role?: 'assistant' | 'moderator';
          granted_by?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: 'admin' | 'member';
      seminar_role: 'assistant' | 'moderator';
      seminar_status: 'draft' | 'recruiting' | 'in_progress' | 'completed' | 'cancelled';
      session_status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
      enrollment_status: 'pending' | 'approved' | 'rejected' | 'cancelled';
      attendance_status: 'present' | 'absent' | 'late' | 'excused';
      notification_type: 'enrollment_approved' | 'enrollment_rejected' | 'session_reminder' | 'seminar_updated' | 'announcement' | 'attendance_marked';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}; 