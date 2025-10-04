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
      candidate_embeddings: {
        Row: {
          candidate_id: string
          created_at: string | null
          cv_embedding: Json | null
          id: string
          skill_embeddings: Json
          updated_at: string | null
        }
        Insert: {
          candidate_id: string
          created_at?: string | null
          cv_embedding?: Json | null
          id?: string
          skill_embeddings: Json
          updated_at?: string | null
        }
        Update: {
          candidate_id?: string
          created_at?: string | null
          cv_embedding?: Json | null
          id?: string
          skill_embeddings?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_embeddings_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: true
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          cv_path: string | null
          decision: string | null
          email: string | null
          extracted_skills: Json | null
          github: string | null
          id: string
          job_id: string
          linkedin: string | null
          match_score: number | null
          name: string
          phone: string | null
          portfolio: string | null
          submitted_at: string
          user_id: string
        }
        Insert: {
          cv_path?: string | null
          decision?: string | null
          email?: string | null
          extracted_skills?: Json | null
          github?: string | null
          id?: string
          job_id: string
          linkedin?: string | null
          match_score?: number | null
          name: string
          phone?: string | null
          portfolio?: string | null
          submitted_at?: string
          user_id: string
        }
        Update: {
          cv_path?: string | null
          decision?: string | null
          email?: string | null
          extracted_skills?: Json | null
          github?: string | null
          id?: string
          job_id?: string
          linkedin?: string | null
          match_score?: number | null
          name?: string
          phone?: string | null
          portfolio?: string | null
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_data: {
        Row: {
          candidate_id: string
          created_at: string | null
          feedback_notes: string | null
          hired: boolean | null
          id: string
          job_id: string
          performance_rating: number | null
        }
        Insert: {
          candidate_id: string
          created_at?: string | null
          feedback_notes?: string | null
          hired?: boolean | null
          id?: string
          job_id: string
          performance_rating?: number | null
        }
        Update: {
          candidate_id?: string
          created_at?: string | null
          feedback_notes?: string | null
          hired?: boolean | null
          id?: string
          job_id?: string
          performance_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_data_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_data_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          created_at: string
          id: string
          job_description: string
          mandatory_skills: Json | null
          preferred_skills: Json | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_description: string
          mandatory_skills?: Json | null
          preferred_skills?: Json | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_description?: string
          mandatory_skills?: Json | null
          preferred_skills?: Json | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      market_intelligence: {
        Row: {
          avg_salary_range: Json | null
          created_at: string | null
          demand_score: number | null
          id: string
          skill_name: string
          supply_score: number | null
          trend_direction: string | null
          updated_at: string | null
        }
        Insert: {
          avg_salary_range?: Json | null
          created_at?: string | null
          demand_score?: number | null
          id?: string
          skill_name: string
          supply_score?: number | null
          trend_direction?: string | null
          updated_at?: string | null
        }
        Update: {
          avg_salary_range?: Json | null
          created_at?: string | null
          demand_score?: number | null
          id?: string
          skill_name?: string
          supply_score?: number | null
          trend_direction?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ml_scores: {
        Row: {
          candidate_id: string
          confidence_interval: Json | null
          created_at: string | null
          cultural_fit_score: number
          experience_match_score: number
          feature_importance: Json | null
          growth_potential_score: number
          id: string
          job_id: string
          overall_score: number
          technical_fit_score: number
          updated_at: string | null
        }
        Insert: {
          candidate_id: string
          confidence_interval?: Json | null
          created_at?: string | null
          cultural_fit_score: number
          experience_match_score: number
          feature_importance?: Json | null
          growth_potential_score: number
          id?: string
          job_id: string
          overall_score: number
          technical_fit_score: number
          updated_at?: string | null
        }
        Update: {
          candidate_id?: string
          confidence_interval?: Json | null
          created_at?: string | null
          cultural_fit_score?: number
          experience_match_score?: number
          feature_importance?: Json | null
          growth_potential_score?: number
          id?: string
          job_id?: string
          overall_score?: number
          technical_fit_score?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ml_scores_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ml_scores_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      model_versions: {
        Row: {
          accuracy_metrics: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          model_name: string
          version: string
        }
        Insert: {
          accuracy_metrics?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          model_name: string
          version: string
        }
        Update: {
          accuracy_metrics?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          model_name?: string
          version?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          cv_url: string | null
          email: string | null
          full_name: string | null
          github_url: string | null
          id: string
          linkedin_url: string | null
          phone: string | null
          portfolio_url: string | null
          skills: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          cv_url?: string | null
          email?: string | null
          full_name?: string | null
          github_url?: string | null
          id?: string
          linkedin_url?: string | null
          phone?: string | null
          portfolio_url?: string | null
          skills?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          cv_url?: string | null
          email?: string | null
          full_name?: string | null
          github_url?: string | null
          id?: string
          linkedin_url?: string | null
          phone?: string | null
          portfolio_url?: string | null
          skills?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      test_cv_files: {
        Row: {
          filename: string
          id: string
          storage_path: string
          test_case_id: string
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          filename: string
          id?: string
          storage_path: string
          test_case_id: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          filename?: string
          id?: string
          storage_path?: string
          test_case_id?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: []
      }
      test_results: {
        Row: {
          actual_data: Json
          expected_data: Json
          field_results: Json
          id: string
          passed: boolean
          run_at: string | null
          run_by: string | null
          test_case_id: string
          test_run_id: string
        }
        Insert: {
          actual_data: Json
          expected_data: Json
          field_results: Json
          id?: string
          passed: boolean
          run_at?: string | null
          run_by?: string | null
          test_case_id: string
          test_run_id: string
        }
        Update: {
          actual_data?: Json
          expected_data?: Json
          field_results?: Json
          id?: string
          passed?: boolean
          run_at?: string | null
          run_by?: string | null
          test_case_id?: string
          test_run_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "hr" | "candidate"
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
      app_role: ["hr", "candidate"],
    },
  },
} as const
