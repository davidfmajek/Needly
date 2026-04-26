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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      saved_places: {
        Row: {
          category: string | null
          created_at: string
          id: string
          place_name: string
          reason: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          place_name: string
          reason?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          place_name?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_day_tasks: {
        Row: {
          completed: boolean
          created_at: string
          end_hour: number | null
          id: string
          notes: string | null
          start_hour: number | null
          supplies_query: string | null
          task_date: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          end_hour?: number | null
          id?: string
          notes?: string | null
          start_hour?: number | null
          supplies_query?: string | null
          task_date: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          end_hour?: number | null
          id?: string
          notes?: string | null
          start_hour?: number | null
          supplies_query?: string | null
          task_date?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_calendar_connections: {
        Row: {
          access_token: string | null
          created_at: string
          email: string | null
          expires_at: string | null
          id: string
          provider: string
          refresh_token: string | null
          scope: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string | null
          id?: string
          provider: string
          refresh_token?: string | null
          scope?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string | null
          id?: string
          provider?: string
          refresh_token?: string | null
          scope?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          age: number | null
          age_range: string | null
          budget: string | null
          created_at: string
          dietary_restrictions: string[] | null
          display_name: string | null
          food_preferences: string[] | null
          gender: string | null
          id: string
          initial_context: string | null
          interests: string[] | null
          latitude: number | null
          longitude: number | null
          onboarding_completed: boolean
          other_interests: string | null
          transportation: string | null
          updated_at: string
          user_id: string
          weekly_schedule_context: string | null
          weekly_schedule_grid: Json | null
        }
        Insert: {
          age?: number | null
          age_range?: string | null
          budget?: string | null
          created_at?: string
          dietary_restrictions?: string[] | null
          display_name?: string | null
          food_preferences?: string[] | null
          gender?: string | null
          id?: string
          initial_context?: string | null
          interests?: string[] | null
          latitude?: number | null
          longitude?: number | null
          onboarding_completed?: boolean
          other_interests?: string | null
          transportation?: string | null
          updated_at?: string
          user_id: string
          weekly_schedule_context?: string | null
          weekly_schedule_grid?: Json | null
        }
        Update: {
          age?: number | null
          age_range?: string | null
          budget?: string | null
          created_at?: string
          dietary_restrictions?: string[] | null
          display_name?: string | null
          food_preferences?: string[] | null
          gender?: string | null
          id?: string
          initial_context?: string | null
          interests?: string[] | null
          latitude?: number | null
          longitude?: number | null
          onboarding_completed?: boolean
          other_interests?: string | null
          transportation?: string | null
          updated_at?: string
          user_id?: string
          weekly_schedule_context?: string | null
          weekly_schedule_grid?: Json | null
        }
        Relationships: []
      }
      user_recommendation_events: {
        Row: {
          category: string | null
          created_at: string
          event_type: string
          id: string
          intent: string | null
          latitude: number | null
          longitude: number | null
          metadata: Json
          place_id: string | null
          place_name: string | null
          user_id: string
          zone_label: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          event_type: string
          id?: string
          intent?: string | null
          latitude?: number | null
          longitude?: number | null
          metadata?: Json
          place_id?: string | null
          place_name?: string | null
          user_id: string
          zone_label?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          event_type?: string
          id?: string
          intent?: string | null
          latitude?: number | null
          longitude?: number | null
          metadata?: Json
          place_id?: string | null
          place_name?: string | null
          user_id?: string
          zone_label?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      user_place_affinities: {
        Row: {
          affinity_score: number | null
          category: string | null
          last_interacted_at: string | null
          last_intent: string | null
          last_zone_label: string | null
          place_id: string | null
          place_name: string | null
          total_events: number | null
          user_id: string | null
        }
        Relationships: []
      }
      user_zone_affinities: {
        Row: {
          last_interacted_at: string | null
          total_events: number | null
          user_id: string | null
          zone_label: string | null
          zone_score: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      refresh_user_personalization_views: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
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
