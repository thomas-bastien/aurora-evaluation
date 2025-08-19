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
      evaluations: {
        Row: {
          created_at: string
          evaluator_id: string
          financials_feedback: string | null
          financials_score: number | null
          id: string
          investment_amount: number | null
          market_feedback: string | null
          market_score: number | null
          overall_notes: string | null
          overall_score: number | null
          product_feedback: string | null
          product_score: number | null
          recommendation: string | null
          startup_id: string
          status: string | null
          team_feedback: string | null
          team_score: number | null
          traction_feedback: string | null
          traction_score: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          evaluator_id: string
          financials_feedback?: string | null
          financials_score?: number | null
          id?: string
          investment_amount?: number | null
          market_feedback?: string | null
          market_score?: number | null
          overall_notes?: string | null
          overall_score?: number | null
          product_feedback?: string | null
          product_score?: number | null
          recommendation?: string | null
          startup_id: string
          status?: string | null
          team_feedback?: string | null
          team_score?: number | null
          traction_feedback?: string | null
          traction_score?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          evaluator_id?: string
          financials_feedback?: string | null
          financials_score?: number | null
          id?: string
          investment_amount?: number | null
          market_feedback?: string | null
          market_score?: number | null
          overall_notes?: string | null
          overall_score?: number | null
          product_feedback?: string | null
          product_score?: number | null
          recommendation?: string | null
          startup_id?: string
          status?: string | null
          team_feedback?: string | null
          team_score?: number | null
          traction_feedback?: string | null
          traction_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_evaluator_id_fkey"
            columns: ["evaluator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "evaluations_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      jurors: {
        Row: {
          company: string | null
          created_at: string
          email: string
          id: string
          job_title: string | null
          name: string
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          id?: string
          job_title?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          job_title?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      pitch_requests: {
        Row: {
          calendly_link: string | null
          created_at: string
          id: string
          meeting_notes: string | null
          pitch_date: string | null
          request_date: string | null
          startup_id: string
          status: string | null
          updated_at: string
          vc_id: string
        }
        Insert: {
          calendly_link?: string | null
          created_at?: string
          id?: string
          meeting_notes?: string | null
          pitch_date?: string | null
          request_date?: string | null
          startup_id: string
          status?: string | null
          updated_at?: string
          vc_id: string
        }
        Update: {
          calendly_link?: string | null
          created_at?: string
          id?: string
          meeting_notes?: string | null
          pitch_date?: string | null
          request_date?: string | null
          startup_id?: string
          status?: string | null
          updated_at?: string
          vc_id?: string
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
      profiles: {
        Row: {
          calendly_link: string | null
          created_at: string
          expertise: string[] | null
          full_name: string | null
          id: string
          investment_stages: string[] | null
          organization: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          calendly_link?: string | null
          created_at?: string
          expertise?: string[] | null
          full_name?: string | null
          id?: string
          investment_stages?: string[] | null
          organization?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          calendly_link?: string | null
          created_at?: string
          expertise?: string[] | null
          full_name?: string | null
          id?: string
          investment_stages?: string[] | null
          organization?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      startup_assignments: {
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
        Relationships: []
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
          contact_email: string | null
          contact_phone: string | null
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
          key_metrics: Json | null
          location: string | null
          name: string
          pitch_deck_url: string | null
          stage: string | null
          status: string | null
          team_size: number | null
          updated_at: string
          website: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
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
          key_metrics?: Json | null
          location?: string | null
          name: string
          pitch_deck_url?: string | null
          stage?: string | null
          status?: string | null
          team_size?: number | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
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
          key_metrics?: Json | null
          location?: string | null
          name?: string
          pitch_deck_url?: string | null
          stage?: string | null
          status?: string | null
          team_size?: number | null
          updated_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      user_role: "vc" | "admin"
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
      user_role: ["vc", "admin"],
    },
  },
} as const
