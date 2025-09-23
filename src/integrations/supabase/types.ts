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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      cm_calendar_invitations: {
        Row: {
          attendee_emails: Json | null
          calendar_uid: string | null
          created_at: string
          event_description: string | null
          event_end_date: string | null
          event_location: string | null
          event_method: string | null
          event_start_date: string | null
          event_summary: string | null
          id: string
          juror_id: string | null
          lifecycle_history: Json | null
          manual_assignment_needed: boolean | null
          matching_errors: Json | null
          matching_status: string | null
          pitching_assignment_id: string | null
          previous_event_date: string | null
          sequence_number: number | null
          startup_id: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          attendee_emails?: Json | null
          calendar_uid?: string | null
          created_at?: string
          event_description?: string | null
          event_end_date?: string | null
          event_location?: string | null
          event_method?: string | null
          event_start_date?: string | null
          event_summary?: string | null
          id?: string
          juror_id?: string | null
          lifecycle_history?: Json | null
          manual_assignment_needed?: boolean | null
          matching_errors?: Json | null
          matching_status?: string | null
          pitching_assignment_id?: string | null
          previous_event_date?: string | null
          sequence_number?: number | null
          startup_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          attendee_emails?: Json | null
          calendar_uid?: string | null
          created_at?: string
          event_description?: string | null
          event_end_date?: string | null
          event_location?: string | null
          event_method?: string | null
          event_start_date?: string | null
          event_summary?: string | null
          id?: string
          juror_id?: string | null
          lifecycle_history?: Json | null
          manual_assignment_needed?: boolean | null
          matching_errors?: Json | null
          matching_status?: string | null
          pitching_assignment_id?: string | null
          previous_event_date?: string | null
          sequence_number?: number | null
          startup_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cm_calendar_invitations_juror_id_fkey"
            columns: ["juror_id"]
            isOneToOne: false
            referencedRelation: "jurors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cm_calendar_invitations_pitching_assignment_id_fkey"
            columns: ["pitching_assignment_id"]
            isOneToOne: false
            referencedRelation: "pitching_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cm_calendar_invitations_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      cohort_settings: {
        Row: {
          cohort_name: string
          created_at: string
          created_by: string | null
          id: string
          pitching_deadline: string | null
          screening_deadline: string | null
          updated_at: string
        }
        Insert: {
          cohort_name?: string
          created_at?: string
          created_by?: string | null
          id?: string
          pitching_deadline?: string | null
          screening_deadline?: string | null
          updated_at?: string
        }
        Update: {
          cohort_name?: string
          created_at?: string
          created_by?: string | null
          id?: string
          pitching_deadline?: string | null
          screening_deadline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      communication_attempts: {
        Row: {
          attempt_number: number
          attempt_status: string
          attempted_at: string | null
          communication_id: string | null
          created_at: string
          error_message: string | null
          id: string
          scheduled_at: string | null
          updated_at: string
          workflow_id: string
        }
        Insert: {
          attempt_number?: number
          attempt_status?: string
          attempted_at?: string | null
          communication_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          scheduled_at?: string | null
          updated_at?: string
          workflow_id: string
        }
        Update: {
          attempt_number?: number
          attempt_status?: string
          attempted_at?: string | null
          communication_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          scheduled_at?: string | null
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_attempts_communication_id_fkey"
            columns: ["communication_id"]
            isOneToOne: false
            referencedRelation: "email_communications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_attempts_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "communication_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_workflows: {
        Row: {
          created_at: string
          current_stage: Database["public"]["Enums"]["communication_stage"]
          id: string
          next_action_due: string | null
          participant_id: string
          participant_type: string
          stage_completed_at: string | null
          stage_data: Json | null
          stage_entered_at: string
          stage_status: Database["public"]["Enums"]["workflow_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_stage?: Database["public"]["Enums"]["communication_stage"]
          id?: string
          next_action_due?: string | null
          participant_id: string
          participant_type: string
          stage_completed_at?: string | null
          stage_data?: Json | null
          stage_entered_at?: string
          stage_status?: Database["public"]["Enums"]["workflow_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_stage?: Database["public"]["Enums"]["communication_stage"]
          id?: string
          next_action_due?: string | null
          participant_id?: string
          participant_type?: string
          stage_completed_at?: string | null
          stage_data?: Json | null
          stage_entered_at?: string
          stage_status?: Database["public"]["Enums"]["workflow_status"]
          updated_at?: string
        }
        Relationships: []
      }
      email_communications: {
        Row: {
          body: string
          bounced_at: string | null
          clicked_at: string | null
          content_hash: string
          created_at: string
          delivered_at: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          opened_at: string | null
          recipient_email: string
          recipient_id: string | null
          recipient_type: string
          resend_email_id: string | null
          sent_at: string | null
          status: string
          subject: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          body: string
          bounced_at?: string | null
          clicked_at?: string | null
          content_hash: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          recipient_email: string
          recipient_id?: string | null
          recipient_type: string
          resend_email_id?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          body?: string
          bounced_at?: string | null
          clicked_at?: string | null
          content_hash?: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          recipient_email?: string
          recipient_id?: string | null
          recipient_type?: string
          resend_email_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_communications_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_delivery_events: {
        Row: {
          communication_id: string
          created_at: string
          event_type: string
          id: string
          raw_payload: Json | null
          resend_event_id: string | null
          timestamp: string
        }
        Insert: {
          communication_id: string
          created_at?: string
          event_type: string
          id?: string
          raw_payload?: Json | null
          resend_event_id?: string | null
          timestamp?: string
        }
        Update: {
          communication_id?: string
          created_at?: string
          event_type?: string
          id?: string
          raw_payload?: Json | null
          resend_event_id?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_delivery_events_communication_id_fkey"
            columns: ["communication_id"]
            isOneToOne: false
            referencedRelation: "email_communications"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          auto_trigger_events: Json | null
          body_template: string
          category: string
          created_at: string
          created_by: string | null
          evaluation_phase: string | null
          id: string
          is_active: boolean
          lifecycle_stage: string | null
          name: string
          subject_template: string
          trigger_priority: number | null
          updated_at: string
          variables: Json | null
          version: number
        }
        Insert: {
          auto_trigger_events?: Json | null
          body_template: string
          category: string
          created_at?: string
          created_by?: string | null
          evaluation_phase?: string | null
          id?: string
          is_active?: boolean
          lifecycle_stage?: string | null
          name: string
          subject_template: string
          trigger_priority?: number | null
          updated_at?: string
          variables?: Json | null
          version?: number
        }
        Update: {
          auto_trigger_events?: Json | null
          body_template?: string
          category?: string
          created_at?: string
          created_by?: string | null
          evaluation_phase?: string | null
          id?: string
          is_active?: boolean
          lifecycle_stage?: string | null
          name?: string
          subject_template?: string
          trigger_priority?: number | null
          updated_at?: string
          variables?: Json | null
          version?: number
        }
        Relationships: []
      }
      jurors: {
        Row: {
          calendly_link: string | null
          company: string | null
          created_at: string
          email: string
          id: string
          invitation_expires_at: string | null
          invitation_sent_at: string | null
          invitation_token: string | null
          job_title: string | null
          linkedin_url: string | null
          name: string
          preferred_regions: string[] | null
          preferred_stages: string[] | null
          target_verticals: string[] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          calendly_link?: string | null
          company?: string | null
          created_at?: string
          email: string
          id?: string
          invitation_expires_at?: string | null
          invitation_sent_at?: string | null
          invitation_token?: string | null
          job_title?: string | null
          linkedin_url?: string | null
          name: string
          preferred_regions?: string[] | null
          preferred_stages?: string[] | null
          target_verticals?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          calendly_link?: string | null
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          invitation_expires_at?: string | null
          invitation_sent_at?: string | null
          invitation_token?: string | null
          job_title?: string | null
          linkedin_url?: string | null
          name?: string
          preferred_regions?: string[] | null
          preferred_stages?: string[] | null
          target_verticals?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      lifecycle_participants: {
        Row: {
          created_at: string
          id: string
          lifecycle_stage: string
          metadata: Json | null
          participant_id: string
          participant_type: string
          stage_entered_at: string
          stage_status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          lifecycle_stage: string
          metadata?: Json | null
          participant_id: string
          participant_type: string
          stage_entered_at?: string
          stage_status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          lifecycle_stage?: string
          metadata?: Json | null
          participant_id?: string
          participant_type?: string
          stage_entered_at?: string
          stage_status?: string
          updated_at?: string
        }
        Relationships: []
      }
      pitch_requests: {
        Row: {
          assignment_status: string | null
          attendee_emails: Json | null
          calendly_link: string | null
          created_at: string
          event_title: string | null
          id: string
          meeting_notes: string | null
          pitch_date: string | null
          request_date: string | null
          startup_id: string | null
          status: string | null
          updated_at: string
          vc_id: string | null
        }
        Insert: {
          assignment_status?: string | null
          attendee_emails?: Json | null
          calendly_link?: string | null
          created_at?: string
          event_title?: string | null
          id?: string
          meeting_notes?: string | null
          pitch_date?: string | null
          request_date?: string | null
          startup_id?: string | null
          status?: string | null
          updated_at?: string
          vc_id?: string | null
        }
        Update: {
          assignment_status?: string | null
          attendee_emails?: Json | null
          calendly_link?: string | null
          created_at?: string
          event_title?: string | null
          id?: string
          meeting_notes?: string | null
          pitch_date?: string | null
          request_date?: string | null
          startup_id?: string | null
          status?: string | null
          updated_at?: string
          vc_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pitch_requests_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      pitching_assignments: {
        Row: {
          assigned_by: string | null
          calendly_link: string | null
          created_at: string
          id: string
          juror_id: string
          meeting_completed_date: string | null
          meeting_notes: string | null
          meeting_scheduled_date: string | null
          startup_id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          calendly_link?: string | null
          created_at?: string
          id?: string
          juror_id: string
          meeting_completed_date?: string | null
          meeting_notes?: string | null
          meeting_scheduled_date?: string | null
          startup_id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          calendly_link?: string | null
          created_at?: string
          id?: string
          juror_id?: string
          meeting_completed_date?: string | null
          meeting_notes?: string | null
          meeting_scheduled_date?: string | null
          startup_id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_pitching_assignments_juror"
            columns: ["juror_id"]
            isOneToOne: false
            referencedRelation: "jurors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pitching_assignments_startup"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      pitching_evaluations: {
        Row: {
          created_at: string
          criteria_scores: Json | null
          evaluator_id: string
          guided_feedback: string[] | null
          id: string
          improvement_areas: string | null
          investment_amount: number | null
          last_modified_at: string | null
          overall_notes: string | null
          overall_score: number | null
          pitch_development_aspects: string | null
          recommendation: string | null
          startup_id: string
          status: string | null
          strengths: string[] | null
          updated_at: string
          wants_pitch_session: boolean | null
        }
        Insert: {
          created_at?: string
          criteria_scores?: Json | null
          evaluator_id: string
          guided_feedback?: string[] | null
          id?: string
          improvement_areas?: string | null
          investment_amount?: number | null
          last_modified_at?: string | null
          overall_notes?: string | null
          overall_score?: number | null
          pitch_development_aspects?: string | null
          recommendation?: string | null
          startup_id: string
          status?: string | null
          strengths?: string[] | null
          updated_at?: string
          wants_pitch_session?: boolean | null
        }
        Update: {
          created_at?: string
          criteria_scores?: Json | null
          evaluator_id?: string
          guided_feedback?: string[] | null
          id?: string
          improvement_areas?: string | null
          investment_amount?: number | null
          last_modified_at?: string | null
          overall_notes?: string | null
          overall_score?: number | null
          pitch_development_aspects?: string | null
          recommendation?: string | null
          startup_id?: string
          status?: string | null
          strengths?: string[] | null
          updated_at?: string
          wants_pitch_session?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_pitching_evaluations_startup"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          organization: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id?: string
          organization?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          organization?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rounds: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          name: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          name: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          name?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      screening_assignments: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          juror_id: string
          startup_id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          juror_id: string
          startup_id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          juror_id?: string
          startup_id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_screening_assignments_juror"
            columns: ["juror_id"]
            isOneToOne: false
            referencedRelation: "jurors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_screening_assignments_startup"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      screening_evaluations: {
        Row: {
          created_at: string
          criteria_scores: Json | null
          evaluator_id: string
          guided_feedback: string[] | null
          id: string
          improvement_areas: string | null
          investment_amount: number | null
          last_modified_at: string | null
          overall_notes: string | null
          overall_score: number | null
          pitch_development_aspects: string | null
          recommendation: string | null
          startup_id: string
          status: string | null
          strengths: string[] | null
          updated_at: string
          wants_pitch_session: boolean | null
        }
        Insert: {
          created_at?: string
          criteria_scores?: Json | null
          evaluator_id: string
          guided_feedback?: string[] | null
          id?: string
          improvement_areas?: string | null
          investment_amount?: number | null
          last_modified_at?: string | null
          overall_notes?: string | null
          overall_score?: number | null
          pitch_development_aspects?: string | null
          recommendation?: string | null
          startup_id: string
          status?: string | null
          strengths?: string[] | null
          updated_at?: string
          wants_pitch_session?: boolean | null
        }
        Update: {
          created_at?: string
          criteria_scores?: Json | null
          evaluator_id?: string
          guided_feedback?: string[] | null
          id?: string
          improvement_areas?: string | null
          investment_amount?: number | null
          last_modified_at?: string | null
          overall_notes?: string | null
          overall_score?: number | null
          pitch_development_aspects?: string | null
          recommendation?: string | null
          startup_id?: string
          status?: string | null
          strengths?: string[] | null
          updated_at?: string
          wants_pitch_session?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_screening_evaluations_startup"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          avg_score: number | null
          category: string | null
          completion_rate: number | null
          created_at: string
          description: string | null
          id: string
          name: string
          scheduled_date: string | null
          status: string | null
          time_slot: string | null
          updated_at: string
          vc_participants: number | null
        }
        Insert: {
          avg_score?: number | null
          category?: string | null
          completion_rate?: number | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          scheduled_date?: string | null
          status?: string | null
          time_slot?: string | null
          updated_at?: string
          vc_participants?: number | null
        }
        Update: {
          avg_score?: number | null
          category?: string | null
          completion_rate?: number | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          scheduled_date?: string | null
          status?: string | null
          time_slot?: string | null
          updated_at?: string
          vc_participants?: number | null
        }
        Relationships: []
      }
      startup_round_statuses: {
        Row: {
          created_at: string
          id: string
          round_id: string
          startup_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          round_id: string
          startup_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          round_id?: string
          startup_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "startup_round_statuses_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "startup_round_statuses_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      startup_sessions: {
        Row: {
          created_at: string
          id: string
          order_index: number | null
          session_id: string
          startup_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_index?: number | null
          session_id: string
          startup_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_index?: number | null
          session_id?: string
          startup_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "startup_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "startup_sessions_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      startups: {
        Row: {
          business_model: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          created_by: string | null
          demo_url: string | null
          description: string | null
          founded_year: number | null
          founder_names: string[] | null
          funding_goal: number | null
          funding_raised: number | null
          id: string
          industry: string | null
          investment_currency: string | null
          key_metrics: Json | null
          linkedin_url: string | null
          location: string | null
          name: string
          other_vertical_description: string | null
          pitch_deck_url: string | null
          region: string | null
          regions: string[] | null
          stage: string | null
          status: string | null
          team_size: number | null
          total_investment_received: number | null
          updated_at: string
          verticals: string[] | null
          website: string | null
        }
        Insert: {
          business_model?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          demo_url?: string | null
          description?: string | null
          founded_year?: number | null
          founder_names?: string[] | null
          funding_goal?: number | null
          funding_raised?: number | null
          id?: string
          industry?: string | null
          investment_currency?: string | null
          key_metrics?: Json | null
          linkedin_url?: string | null
          location?: string | null
          name: string
          other_vertical_description?: string | null
          pitch_deck_url?: string | null
          region?: string | null
          regions?: string[] | null
          stage?: string | null
          status?: string | null
          team_size?: number | null
          total_investment_received?: number | null
          updated_at?: string
          verticals?: string[] | null
          website?: string | null
        }
        Update: {
          business_model?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          demo_url?: string | null
          description?: string | null
          founded_year?: number | null
          founder_names?: string[] | null
          funding_goal?: number | null
          funding_raised?: number | null
          id?: string
          industry?: string | null
          investment_currency?: string | null
          key_metrics?: Json | null
          linkedin_url?: string | null
          location?: string | null
          name?: string
          other_vertical_description?: string | null
          pitch_deck_url?: string | null
          region?: string | null
          regions?: string[] | null
          stage?: string | null
          status?: string | null
          team_size?: number | null
          total_investment_received?: number | null
          updated_at?: string
          verticals?: string[] | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "startups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      vc_sessions: {
        Row: {
          created_at: string
          id: string
          session_id: string
          status: string | null
          vc_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          session_id: string
          status?: string | null
          vc_id: string
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string
          status?: string | null
          vc_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vc_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_triggers: {
        Row: {
          created_at: string
          delay_hours: number | null
          email_template_category: string | null
          id: string
          is_active: boolean
          max_attempts: number | null
          participant_type: string
          stage: Database["public"]["Enums"]["communication_stage"]
          trigger_condition: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          delay_hours?: number | null
          email_template_category?: string | null
          id?: string
          is_active?: boolean
          max_attempts?: number | null
          participant_type: string
          stage: Database["public"]["Enums"]["communication_stage"]
          trigger_condition: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          delay_hours?: number | null
          email_template_category?: string | null
          id?: string
          is_active?: boolean
          max_attempts?: number | null
          participant_type?: string
          stage?: Database["public"]["Enums"]["communication_stage"]
          trigger_condition?: Json
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      advance_participant_lifecycle_stage: {
        Args: {
          p_metadata?: Json
          p_new_stage: string
          p_participant_id: string
          p_participant_type: string
        }
        Returns: boolean
      }
      advance_workflow_stage: {
        Args: {
          p_new_stage: Database["public"]["Enums"]["communication_stage"]
          p_stage_data?: Json
          p_workflow_id: string
        }
        Returns: boolean
      }
      can_modify_round: {
        Args: { round_name: string }
        Returns: boolean
      }
      complete_workflow_stage: {
        Args: { p_completion_data?: Json; p_workflow_id: string }
        Returns: boolean
      }
      get_current_round: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_participant_workflow_status: {
        Args: { p_participant_id: string; p_participant_type: string }
        Returns: {
          current_stage: string
          next_action_due: string
          stage_completed_at: string
          stage_entered_at: string
          stage_status: string
          workflow_id: string
        }[]
      }
      get_startup_status_for_round: {
        Args: { round_name: string; startup_uuid: string }
        Returns: string
      }
      update_startup_status_for_round: {
        Args: { new_status: string; round_name: string; startup_uuid: string }
        Returns: undefined
      }
      validate_evaluation_assignment: {
        Args: {
          p_evaluation_type: string
          p_evaluator_id: string
          p_startup_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      communication_stage:
        | "juror_onboarding"
        | "assignment_notification"
        | "evaluation_reminders"
        | "screening_results"
        | "pitching_assignment"
        | "pitch_reminders"
        | "final_results"
      user_role: "vc" | "admin"
      workflow_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "skipped"
        | "failed"
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
    Enums: {
      communication_stage: [
        "juror_onboarding",
        "assignment_notification",
        "evaluation_reminders",
        "screening_results",
        "pitching_assignment",
        "pitch_reminders",
        "final_results",
      ],
      user_role: ["vc", "admin"],
      workflow_status: [
        "pending",
        "in_progress",
        "completed",
        "skipped",
        "failed",
      ],
    },
  },
} as const
