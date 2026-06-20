export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          cycle_session_id: string | null
          date: string | null
          enrollment_id: string
          id: number
          notes: string | null
          recorded_at: string
          status: string | null
        }
        Insert: {
          cycle_session_id?: string | null
          date?: string | null
          enrollment_id: string
          id?: number
          notes?: string | null
          recorded_at?: string
          status?: string | null
        }
        Update: {
          cycle_session_id?: string | null
          date?: string | null
          enrollment_id?: string
          id?: number
          notes?: string | null
          recorded_at?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_cycle_session_id_fkey"
            columns: ["cycle_session_id"]
            isOneToOne: false
            referencedRelation: "cycle_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_assignments: {
        Row: {
          coach_profile_id: string
          created_at: string
          created_by: string | null
          cycle_id: string | null
          id: string
          student_profile_id: string
        }
        Insert: {
          coach_profile_id: string
          created_at?: string
          created_by?: string | null
          cycle_id?: string | null
          id?: string
          student_profile_id: string
        }
        Update: {
          coach_profile_id?: string
          created_at?: string
          created_by?: string | null
          cycle_id?: string | null
          id?: string
          student_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_assignments_coach_profile_id_fkey"
            columns: ["coach_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_assignments_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_assignments_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_sessions: {
        Row: {
          course_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_mandatory: boolean
          label: string | null
          location_url: string | null
          session_date: string
          session_time: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_mandatory?: boolean
          label?: string | null
          location_url?: string | null
          session_date: string
          session_time?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_mandatory?: boolean
          label?: string | null
          location_url?: string | null
          session_date?: string
          session_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          is_published: boolean | null
          title: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean | null
          title: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean | null
          title?: string
        }
        Relationships: []
      }
      cycle_sessions: {
        Row: {
          created_at: string
          cycle_id: string
          id: string
          is_mandatory: boolean | null
          label: string | null
          session_date: string
        }
        Insert: {
          created_at?: string
          cycle_id: string
          id?: string
          is_mandatory?: boolean | null
          label?: string | null
          session_date: string
        }
        Update: {
          created_at?: string
          cycle_id?: string
          id?: string
          is_mandatory?: boolean | null
          label?: string | null
          session_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "cycle_sessions_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      cycles: {
        Row: {
          capacity: number | null
          course_id: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          end_date: string
          enrolled_count: number | null
          id: string
          is_deleted: boolean | null
          is_linear: boolean
          name: string
          start_date: string
          status: string | null
          type: string
        }
        Insert: {
          capacity?: number | null
          course_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          end_date: string
          enrolled_count?: number | null
          id?: string
          is_deleted?: boolean | null
          is_linear?: boolean
          name: string
          start_date: string
          status?: string | null
          type: string
        }
        Update: {
          capacity?: number | null
          course_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          end_date?: string
          enrolled_count?: number | null
          id?: string
          is_deleted?: boolean | null
          is_linear?: boolean
          name?: string
          start_date?: string
          status?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cycles_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollment_notes: {
        Row: {
          content: string
          created_at: string
          enrollment_id: string
          id: string
        }
        Insert: {
          content: string
          created_at?: string
          enrollment_id: string
          id?: string
        }
        Update: {
          content?: string
          created_at?: string
          enrollment_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_notes_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          completed_at: string | null
          conflicted_at: string | null
          conflicted_session_id: string | null
          cycle_id: string | null
          enrolled_at: string
          id: string
          package_id: number | null
          payment_status: string | null
          pl_number: number | null
          status: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          conflicted_at?: string | null
          conflicted_session_id?: string | null
          cycle_id?: string | null
          enrolled_at?: string
          id?: string
          package_id?: number | null
          payment_status?: string | null
          pl_number?: number | null
          status?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          conflicted_at?: string | null
          conflicted_session_id?: string | null
          cycle_id?: string | null
          enrolled_at?: string
          id?: string
          package_id?: number | null
          payment_status?: string | null
          pl_number?: number | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_conflicted_session_id_fkey"
            columns: ["conflicted_session_id"]
            isOneToOne: false
            referencedRelation: "cycle_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          admin_notes: string | null
          created_at: string
          data: Json
          deleted_at: string | null
          deleted_by: string | null
          email: string | null
          form_id: string | null
          id: string
          is_deleted: boolean | null
          status: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          data: Json
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          form_id?: string | null
          id?: string
          is_deleted?: boolean | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          data?: Json
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          form_id?: string | null
          id?: string
          is_deleted?: boolean | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_deleted: boolean | null
          schema: Json
          slug: string
          title: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_deleted?: boolean | null
          schema?: Json
          slug: string
          title: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_deleted?: boolean | null
          schema?: Json
          slug?: string
          title?: string
        }
        Relationships: []
      }
      forum_posts: {
        Row: {
          body: string
          course_id: string
          created_at: string
          id: string
          lesson_id: string | null
          parent_id: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          body: string
          course_id: string
          created_at?: string
          id?: string
          lesson_id?: string | null
          parent_id?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          body?: string
          course_id?: string
          created_at?: string
          id?: string
          lesson_id?: string | null
          parent_id?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_posts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_posts_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_posts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          status: string | null
          target_date: string | null
          title: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          status?: string | null
          target_date?: string | null
          title: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          status?: string | null
          target_date?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string
          entered_at: string | null
          id: string
          last_watched_seconds: number | null
          lesson_id: string
          user_id: string
          video_played_at: string | null
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          entered_at?: string | null
          id?: string
          last_watched_seconds?: number | null
          lesson_id: string
          user_id: string
          video_played_at?: string | null
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          entered_at?: string | null
          id?: string
          last_watched_seconds?: number | null
          lesson_id?: string
          user_id?: string
          video_played_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_resources: {
        Row: {
          created_at: string
          file_url: string
          id: string
          lesson_id: string
          title: string
          type: string | null
        }
        Insert: {
          created_at?: string
          file_url: string
          id?: string
          lesson_id: string
          title: string
          type?: string | null
        }
        Update: {
          created_at?: string
          file_url?: string
          id?: string
          lesson_id?: string
          title?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_resources_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_videos: {
        Row: {
          created_at: string
          duration_seconds: number
          id: string
          lesson_id: string
          order_index: number
          title: string | null
          video_url: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number
          id?: string
          lesson_id: string
          order_index?: number
          title?: string | null
          video_url: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          id?: string
          lesson_id?: string
          order_index?: number
          title?: string | null
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_videos_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          block_after_due: boolean
          created_at: string
          description: string | null
          due_days_after_unlock: number | null
          duration_seconds: number | null
          id: string
          is_published: boolean | null
          module_id: string
          order_index: number
          requires_submission: boolean
          status: string
          title: string
          unlock_at: string | null
          unlocked_at: string | null
          video_url: string | null
        }
        Insert: {
          block_after_due?: boolean
          created_at?: string
          description?: string | null
          due_days_after_unlock?: number | null
          duration_seconds?: number | null
          id?: string
          is_published?: boolean | null
          module_id: string
          order_index: number
          requires_submission?: boolean
          status?: string
          title: string
          unlock_at?: string | null
          unlocked_at?: string | null
          video_url?: string | null
        }
        Update: {
          block_after_due?: boolean
          created_at?: string
          description?: string | null
          due_days_after_unlock?: number | null
          duration_seconds?: number | null
          id?: string
          is_published?: boolean | null
          module_id?: string
          order_index?: number
          requires_submission?: boolean
          status?: string
          title?: string
          unlock_at?: string | null
          unlocked_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_info: {
        Row: {
          allergies: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          medication: string | null
          treatment_details: string | null
          under_treatment: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allergies?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          medication?: string | null
          treatment_details?: string | null
          under_treatment?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allergies?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          medication?: string | null
          treatment_details?: string | null
          under_treatment?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_info_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          course_id: string
          created_at: string
          id: string
          is_published: boolean | null
          module_type: string
          order_index: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          is_published?: boolean | null
          module_type?: string
          order_index: number
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          is_published?: boolean | null
          module_type?: string
          order_index?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string
          created_at: string
          id: string
          is_read: boolean | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          description: string | null
          duration_days: number | null
          id: number
          is_active: boolean | null
          name: string
          price: number | null
          stage_order: number
        }
        Insert: {
          description?: string | null
          duration_days?: number | null
          id?: number
          is_active?: boolean | null
          name: string
          price?: number | null
          stage_order?: number
        }
        Update: {
          description?: string | null
          duration_days?: number | null
          id?: number
          is_active?: boolean | null
          name?: string
          price?: number | null
          stage_order?: number
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number | null
          created_at: string
          currency: string | null
          enrollment_id: string | null
          external_id: string | null
          id: string
          method: string | null
          package_id: number | null
          paid_at: string | null
          status: string | null
          submission_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          enrollment_id?: string | null
          external_id?: string | null
          id?: string
          method?: string | null
          package_id?: number | null
          paid_at?: string | null
          status?: string | null
          submission_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          enrollment_id?: string | null
          external_id?: string | null
          id?: string
          method?: string | null
          package_id?: number | null
          paid_at?: string | null
          status?: string | null
          submission_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          email: string | null
          first_name: string | null
          id: string
          instagram: string | null
          is_deleted: boolean | null
          last_name: string | null
          phone: string | null
          profile_completed_at: string | null
          role: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          instagram?: string | null
          is_deleted?: boolean | null
          last_name?: string | null
          phone?: string | null
          profile_completed_at?: string | null
          role?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          instagram?: string | null
          is_deleted?: boolean | null
          last_name?: string | null
          phone?: string | null
          profile_completed_at?: string | null
          role?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      registrations: {
        Row: {
          created_at: string
          data: Json
          id: string
          status: string | null
        }
        Insert: {
          created_at?: string
          data: Json
          id?: string
          status?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          status?: string | null
        }
        Relationships: []
      }
      resource_opens: {
        Row: {
          id: string
          lesson_resource_id: string
          opened_at: string
          user_id: string
        }
        Insert: {
          id?: string
          lesson_resource_id: string
          opened_at?: string
          user_id: string
        }
        Update: {
          id?: string
          lesson_resource_id?: string
          opened_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_opens_lesson_resource_id_fkey"
            columns: ["lesson_resource_id"]
            isOneToOne: false
            referencedRelation: "lesson_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_opens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          category: string
          created_at: string
          description: string | null
          input_type: string
          key: string
          label: string
          updated_at: string
          value: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          input_type?: string
          key: string
          label: string
          updated_at?: string
          value: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          input_type?: string
          key?: string
          label?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      staff_activity_event_reads: {
        Row: {
          event_id: string
          profile_id: string
          read_at: string
        }
        Insert: {
          event_id: string
          profile_id: string
          read_at?: string
        }
        Update: {
          event_id?: string
          profile_id?: string
          read_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_activity_event_reads_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "staff_activity_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_activity_event_reads_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_activity_events: {
        Row: {
          actor_profile_id: string | null
          actor_role: string | null
          created_at: string
          details: Json
          event_type: string
          id: string
          subject_profile_id: string | null
          target_id: string | null
          target_kind: string | null
        }
        Insert: {
          actor_profile_id?: string | null
          actor_role?: string | null
          created_at?: string
          details?: Json
          event_type: string
          id?: string
          subject_profile_id?: string | null
          target_id?: string | null
          target_kind?: string | null
        }
        Update: {
          actor_profile_id?: string | null
          actor_role?: string | null
          created_at?: string
          details?: Json
          event_type?: string
          id?: string
          subject_profile_id?: string | null
          target_id?: string | null
          target_kind?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_activity_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_activity_events_subject_profile_id_fkey"
            columns: ["subject_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_goals: {
        Row: {
          created_at: string
          enrollment_id: string
          goal_description: string
          id: string
          staff_feedback: string | null
          status: string | null
          target_date: string | null
          week_number: number | null
        }
        Insert: {
          created_at?: string
          enrollment_id: string
          goal_description: string
          id?: string
          staff_feedback?: string | null
          status?: string | null
          target_date?: string | null
          week_number?: number | null
        }
        Update: {
          created_at?: string
          enrollment_id?: string
          goal_description?: string
          id?: string
          staff_feedback?: string | null
          status?: string | null
          target_date?: string | null
          week_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "student_goals_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_chat_messages: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          lesson_id: string
          student_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          lesson_id: string
          student_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          lesson_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_chat_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_chat_messages_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_chat_messages_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_files: {
        Row: {
          content_type: string | null
          created_at: string
          file_name: string
          id: string
          is_additional: boolean
          is_late: boolean
          size_bytes: number | null
          storage_key: string
          submission_id: string
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          file_name: string
          id?: string
          is_additional?: boolean
          is_late?: boolean
          size_bytes?: number | null
          storage_key: string
          submission_id: string
        }
        Update: {
          content_type?: string | null
          created_at?: string
          file_name?: string
          id?: string
          is_additional?: boolean
          is_late?: boolean
          size_bytes?: number | null
          storage_key?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_files_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_review_files: {
        Row: {
          content_type: string | null
          created_at: string
          file_name: string
          id: string
          review_id: string
          size_bytes: number | null
          storage_key: string
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          file_name: string
          id?: string
          review_id: string
          size_bytes?: number | null
          storage_key: string
        }
        Update: {
          content_type?: string | null
          created_at?: string
          file_name?: string
          id?: string
          review_id?: string
          size_bytes?: number | null
          storage_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_review_files_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "submission_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_reviews: {
        Row: {
          feedback_text: string | null
          id: string
          reviewed_at: string
          reviewed_by: string
          revised_file_name: string | null
          revised_storage_path: string | null
          submission_id: string
        }
        Insert: {
          feedback_text?: string | null
          id?: string
          reviewed_at?: string
          reviewed_by: string
          revised_file_name?: string | null
          revised_storage_path?: string | null
          submission_id: string
        }
        Update: {
          feedback_text?: string | null
          id?: string
          reviewed_at?: string
          reviewed_by?: string
          revised_file_name?: string | null
          revised_storage_path?: string | null
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_reviews_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_reviews_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          allow_additional: boolean
          approved_at: string | null
          approved_by: string | null
          file_name: string | null
          id: string
          is_late: boolean
          lesson_id: string
          status: string
          storage_path: string | null
          submission_url: string | null
          submitted_at: string
          user_id: string
          version: number
        }
        Insert: {
          allow_additional?: boolean
          approved_at?: string | null
          approved_by?: string | null
          file_name?: string | null
          id?: string
          is_late?: boolean
          lesson_id: string
          status?: string
          storage_path?: string | null
          submission_url?: string | null
          submitted_at?: string
          user_id: string
          version?: number
        }
        Update: {
          allow_additional?: boolean
          approved_at?: string | null
          approved_by?: string | null
          file_name?: string | null
          id?: string
          is_late?: boolean
          lesson_id?: string
          status?: string
          storage_path?: string | null
          submission_url?: string | null
          submitted_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "submissions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonials: {
        Row: {
          author_name: string
          created_at: string
          cycle_text: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_deleted: boolean | null
          photo_url: string | null
          quote: string
          rating: number | null
          roles: string[] | null
          status: string | null
          user_id: string | null
          video_url: string | null
        }
        Insert: {
          author_name: string
          created_at?: string
          cycle_text?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean | null
          photo_url?: string | null
          quote: string
          rating?: number | null
          roles?: string[] | null
          status?: string | null
          user_id?: string | null
          video_url?: string | null
        }
        Update: {
          author_name?: string
          created_at?: string
          cycle_text?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean | null
          photo_url?: string | null
          quote?: string
          rating?: number | null
          roles?: string[] | null
          status?: string | null
          user_id?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "testimonials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_checkins: {
        Row: {
          checkin_date: string
          created_at: string
          enrollment_id: string
          id: string
          notes: string | null
          scores: Json
          updated_at: string
          week_number: number
        }
        Insert: {
          checkin_date?: string
          created_at?: string
          enrollment_id: string
          id?: string
          notes?: string | null
          scores?: Json
          updated_at?: string
          week_number: number
        }
        Update: {
          checkin_date?: string
          created_at?: string
          enrollment_id?: string
          id?: string
          notes?: string | null
          scores?: Json
          updated_at?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "weekly_checkins_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      coach_oversees: { Args: { subject_profile_id: string }; Returns: boolean }
      confirm_submission_enrollment: {
        Args: {
          p_cycle_id: string
          p_is_total_payment: boolean
          p_payment_method: string
          p_submission_id: string
        }
        Returns: Json
      }
      current_user_role: { Args: never; Returns: string }
      get_my_profile_id: { Args: never; Returns: string }
      get_student_progress: {
        Args: { p_profile_id?: string }
        Returns: {
          completed_lessons: number
          course_cover: string
          course_id: string
          course_title: string
          cycle_id: string
          cycle_name: string
          enrollment_id: string
          enrollment_status: string
          next_lesson_id: string
          next_lesson_title: string
          next_module_title: string
          progress_percent: number
          total_lessons: number
        }[]
      }
      get_user_role: { Args: never; Returns: string }
      handle_linear_attendance: {
        Args: {
          p_enrollment_id: string
          p_session_id: string
          p_status: string
        }
        Returns: Json
      }
      increment_enrolled_count: {
        Args: { p_cycle_id: string }
        Returns: undefined
      }
      is_coach: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      is_staff_or_coach: { Args: never; Returns: boolean }
      staff_activity_unread_count: { Args: never; Returns: number }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
