export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      announcements: {
        Row: {
          active: boolean | null
          content: string
          created_at: string
          id: string
          is_important: boolean | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          content: string
          created_at?: string
          id?: string
          is_important?: boolean | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          content?: string
          created_at?: string
          id?: string
          is_important?: boolean | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      discord_connections: {
        Row: {
          avatar_url: string | null
          connection_id: string
          connection_name: string
          connection_type: string
          connection_verified: boolean | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          connection_id: string
          connection_name: string
          connection_type: string
          connection_verified?: boolean | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          connection_id?: string
          connection_name?: string
          connection_type?: string
          connection_verified?: boolean | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discord_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discord_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_guild_info"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_guilds: {
        Row: {
          guild_id: string
          guild_name: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          guild_id: string
          guild_name: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          guild_id?: string
          guild_name?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discord_guilds_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discord_guilds_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_guild_info"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_products: {
        Row: {
          created_at: string
          description: string
          featured: boolean | null
          id: string
          image_url: string
          is_featured: boolean | null
          name: string
          price: number | null
          product_url: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          featured?: boolean | null
          id?: string
          image_url: string
          is_featured?: boolean | null
          name: string
          price?: number | null
          product_url: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          featured?: boolean | null
          id?: string
          image_url?: string
          is_featured?: boolean | null
          name?: string
          price?: number | null
          product_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      live_streams: {
        Row: {
          actual_end_time_utc: string | null
          actual_start_time_utc: string | null
          created_at: string
          id: string
          last_checked_at: string
          scheduled_start_time_utc: string | null
          status: string | null
          stream_url: string | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string
          video_id: string
          youtube_channel_id: string
        }
        Insert: {
          actual_end_time_utc?: string | null
          actual_start_time_utc?: string | null
          created_at?: string
          id?: string
          last_checked_at?: string
          scheduled_start_time_utc?: string | null
          status?: string | null
          stream_url?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          video_id: string
          youtube_channel_id: string
        }
        Update: {
          actual_end_time_utc?: string | null
          actual_start_time_utc?: string | null
          created_at?: string
          id?: string
          last_checked_at?: string
          scheduled_start_time_utc?: string | null
          status?: string | null
          stream_url?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          video_id?: string
          youtube_channel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_streams_youtube_channel_id_fkey"
            columns: ["youtube_channel_id"]
            isOneToOne: false
            referencedRelation: "youtube_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_changes: {
        Row: {
          change_timestamp: string
          change_type: string
          channel_name: string
          discord_id: string | null
          id: string
          new_level: string | null
          old_level: string | null
          youtube_connection_id: string
        }
        Insert: {
          change_timestamp?: string
          change_type: string
          channel_name: string
          discord_id?: string | null
          id?: string
          new_level?: string | null
          old_level?: string | null
          youtube_connection_id: string
        }
        Update: {
          change_timestamp?: string
          change_type?: string
          channel_name?: string
          discord_id?: string | null
          id?: string
          new_level?: string | null
          old_level?: string | null
          youtube_connection_id?: string
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          created_at: string
          is_enabled: boolean
          item_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          is_enabled?: boolean
          item_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          is_enabled?: boolean
          item_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_signups: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          discord_avatar: string | null
          discord_id: string
          discord_username: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          discord_avatar?: string | null
          discord_id: string
          discord_username: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          discord_avatar?: string | null
          discord_id?: string
          discord_username?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      schedule_slots: {
        Row: {
          created_at: string
          day_of_week: number[] | null
          default_start_time_utc: string | null
          fallback_title: string | null
          id: string
          is_recurring: boolean
          notes: string | null
          specific_date: string | null
          updated_at: string
          youtube_channel_id: string
        }
        Insert: {
          created_at?: string
          day_of_week?: number[] | null
          default_start_time_utc?: string | null
          fallback_title?: string | null
          id?: string
          is_recurring?: boolean
          notes?: string | null
          specific_date?: string | null
          updated_at?: string
          youtube_channel_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number[] | null
          default_start_time_utc?: string | null
          fallback_title?: string | null
          id?: string
          is_recurring?: boolean
          notes?: string | null
          specific_date?: string | null
          updated_at?: string
          youtube_channel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_slots_youtube_channel_id_fkey"
            columns: ["youtube_channel_id"]
            isOneToOne: false
            referencedRelation: "youtube_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          created_at: string
          id: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_guild_info"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          message_id: string | null
          ticket_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          message_id?: string | null
          ticket_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          message_id?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "ticket_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          content: string
          created_at: string
          from_user: boolean
          id: string
          ticket_id: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string
          from_user?: boolean
          id?: string
          ticket_id: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          from_user?: boolean
          id?: string
          ticket_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_devices: {
        Row: {
          created_at: string
          fingerprint: string
          id: string
          ip_address: unknown | null
          last_seen_at: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          fingerprint: string
          id?: string
          ip_address?: unknown | null
          last_seen_at?: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          fingerprint?: string
          id?: string
          ip_address?: unknown | null
          last_seen_at?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_guild_info"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube_channels: {
        Row: {
          avatar_url: string | null
          channel_name: string | null
          created_at: string
          custom_display_name: string | null
          id: string
          updated_at: string
          youtube_channel_id: string
        }
        Insert: {
          avatar_url?: string | null
          channel_name?: string | null
          created_at?: string
          custom_display_name?: string | null
          id?: string
          updated_at?: string
          youtube_channel_id: string
        }
        Update: {
          avatar_url?: string | null
          channel_name?: string | null
          created_at?: string
          custom_display_name?: string | null
          id?: string
          updated_at?: string
          youtube_channel_id?: string
        }
        Relationships: []
      }
      youtube_connections: {
        Row: {
          created_at: string
          id: string
          is_verified: boolean | null
          updated_at: string
          user_id: string
          youtube_avatar: string | null
          youtube_channel_id: string
          youtube_channel_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_verified?: boolean | null
          updated_at?: string
          user_id: string
          youtube_avatar?: string | null
          youtube_channel_id: string
          youtube_channel_name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_verified?: boolean | null
          updated_at?: string
          user_id?: string
          youtube_avatar?: string | null
          youtube_channel_id?: string
          youtube_channel_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "youtube_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "youtube_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_guild_info"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube_memberships: {
        Row: {
          channel_name: string
          id: string
          membership_level: string
          youtube_connection_id: string
        }
        Insert: {
          channel_name: string
          id?: string
          membership_level: string
          youtube_connection_id: string
        }
        Update: {
          channel_name?: string
          id?: string
          membership_level?: string
          youtube_connection_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      profiles_with_guild_info: {
        Row: {
          created_at: string | null
          discord_avatar: string | null
          discord_id: string | null
          discord_username: string | null
          guild_count: number | null
          id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      are_days_of_week_valid: {
        Args: { days: number[] }
        Returns: boolean
      }
      assert_admin: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      assign_admin_role: {
        Args: {
          target_user_id: string
          target_role: Database["public"]["Enums"]["user_role"]
        }
        Returns: undefined
      }
      get_all_users: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          email: string
          created_at: string
          updated_at: string
          user_metadata: Json
        }[]
      }
      get_guilds_for_user: {
        Args: { user_uuid: string }
        Returns: {
          guild_id: string
          guild_name: string
        }[]
      }
      get_shared_fingerprint_details: {
        Args: Record<PropertyKey, never>
        Returns: {
          fingerprint: string
          user_id: string
          username: string
          discord_id: string
          discord_avatar: string
          last_seen_at: string
          first_seen_at: string
        }[]
      }
      get_shared_youtube_connection_details: {
        Args: Record<PropertyKey, never>
        Returns: {
          youtube_channel_id: string
          youtube_channel_name: string
          user_id: string
          username: string
          discord_id: string
          discord_avatar: string
        }[]
      }
      get_user_guild_counts: {
        Args: Record<PropertyKey, never>
        Returns: {
          user_id: string
          guild_count: number
        }[]
      }
      get_users_by_fingerprint: {
        Args: { p_fingerprint: string }
        Returns: {
          user_id: string
          username: string
        }[]
      }
      has_role: {
        Args:
          | {
              _user_id: string
              _role: Database["public"]["Enums"]["user_role"]
            }
          | { p_user_id: string; p_role_name: string }
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      search_all_guilds: {
        Args: { search_term: string }
        Returns: {
          guild_id: string
          guild_name: string
          user_profile_id: string
          user_discord_username: string
          user_discord_avatar: string
          user_discord_id: string
        }[]
      }
    }
    Enums: {
      user_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: ["admin", "user"],
    },
  },
} as const
