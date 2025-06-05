export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
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
      order_mappings: {
        Row: {
          classification: Database["public"]["Enums"]["order_classification"]
          created_at: string | null
          id: string
          mapped_at: string | null
          mapped_by: string | null
          notes: string | null
          printful_order_id: number
          shopify_order_id: number | null
          updated_at: string | null
        }
        Insert: {
          classification?: Database["public"]["Enums"]["order_classification"]
          created_at?: string | null
          id?: string
          mapped_at?: string | null
          mapped_by?: string | null
          notes?: string | null
          printful_order_id: number
          shopify_order_id?: number | null
          updated_at?: string | null
        }
        Update: {
          classification?: Database["public"]["Enums"]["order_classification"]
          created_at?: string | null
          id?: string
          mapped_at?: string | null
          mapped_by?: string | null
          notes?: string | null
          printful_order_id?: number
          shopify_order_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_mappings_mapped_by_fkey"
            columns: ["mapped_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_mappings_mapped_by_fkey"
            columns: ["mapped_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_guild_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_mappings_printful_order_id_fkey"
            columns: ["printful_order_id"]
            isOneToOne: true
            referencedRelation: "printful_orders"
            referencedColumns: ["printful_internal_id"]
          },
        ]
      }
      printful_order_items: {
        Row: {
          id: string
          item_cost: number | null
          item_currency: string
          item_retail_price: number
          order_printful_internal_id: number
          printful_external_line_item_id: string | null
          printful_line_item_id: number
          printful_product_id: number | null
          printful_variant_id: number
          product_name: string
          quantity: number
          sku: string | null
          variant_details: Json | null
        }
        Insert: {
          id?: string
          item_cost?: number | null
          item_currency: string
          item_retail_price: number
          order_printful_internal_id: number
          printful_external_line_item_id?: string | null
          printful_line_item_id: number
          printful_product_id?: number | null
          printful_variant_id: number
          product_name: string
          quantity: number
          sku?: string | null
          variant_details?: Json | null
        }
        Update: {
          id?: string
          item_cost?: number | null
          item_currency?: string
          item_retail_price?: number
          order_printful_internal_id?: number
          printful_external_line_item_id?: string | null
          printful_line_item_id?: number
          printful_product_id?: number | null
          printful_variant_id?: number
          product_name?: string
          quantity?: number
          sku?: string | null
          variant_details?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_order"
            columns: ["order_printful_internal_id"]
            isOneToOne: false
            referencedRelation: "printful_orders"
            referencedColumns: ["printful_internal_id"]
          },
        ]
      }
      printful_orders: {
        Row: {
          currency: string
          last_synced_at: string
          printful_created_at: string
          printful_external_id: string
          printful_internal_id: number
          printful_updated_at: string | null
          recipient_name: string
          shipping_details: Json
          status: string
          total_amount: number
        }
        Insert: {
          currency: string
          last_synced_at?: string
          printful_created_at: string
          printful_external_id: string
          printful_internal_id: number
          printful_updated_at?: string | null
          recipient_name: string
          shipping_details: Json
          status: string
          total_amount: number
        }
        Update: {
          currency?: string
          last_synced_at?: string
          printful_created_at?: string
          printful_external_id?: string
          printful_internal_id?: number
          printful_updated_at?: string | null
          recipient_name?: string
          shipping_details?: Json
          status?: string
          total_amount?: number
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
          day_of_week: number | null
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
          day_of_week?: number | null
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
          day_of_week?: number | null
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
      shopify_orders: {
        Row: {
          created_at: string
          currency: string
          customer_email: string | null
          customer_name: string
          fulfillment_status: string | null
          id: number
          last_shopify_sync_at: string
          order_date: string
          payment_status: string
          raw_shopify_data: Json | null
          shopify_order_number: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency: string
          customer_email?: string | null
          customer_name: string
          fulfillment_status?: string | null
          id: number
          last_shopify_sync_at?: string
          order_date: string
          payment_status: string
          raw_shopify_data?: Json | null
          shopify_order_number: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string
          fulfillment_status?: string | null
          id?: number
          last_shopify_sync_at?: string
          order_date?: string
          payment_status?: string
          raw_shopify_data?: Json | null
          shopify_order_number?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      shopify_printful_order_links: {
        Row: {
          created_at: string
          id: string
          link_status: Database["public"]["Enums"]["link_status_enum"]
          link_timestamp: string
          link_type: Database["public"]["Enums"]["link_type_enum"]
          linked_by_user_id: string | null
          notes: string | null
          printful_order_internal_id: number | null
          shopify_order_id: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          link_status: Database["public"]["Enums"]["link_status_enum"]
          link_timestamp?: string
          link_type: Database["public"]["Enums"]["link_type_enum"]
          linked_by_user_id?: string | null
          notes?: string | null
          printful_order_internal_id?: number | null
          shopify_order_id: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          link_status?: Database["public"]["Enums"]["link_status_enum"]
          link_timestamp?: string
          link_type?: Database["public"]["Enums"]["link_type_enum"]
          linked_by_user_id?: string | null
          notes?: string | null
          printful_order_internal_id?: number | null
          shopify_order_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_printful_order"
            columns: ["printful_order_internal_id"]
            isOneToOne: false
            referencedRelation: "printful_orders"
            referencedColumns: ["printful_internal_id"]
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
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          from_user?: boolean
          id?: string
          ticket_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          from_user?: boolean
          id?: string
          ticket_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_guild_info"
            referencedColumns: ["id"]
          },
        ]
      }
      user_devices: {
        Row: {
          confidence_score: number | null
          created_at: string
          fingerprint: string
          fingerprint_components: Json | null
          fingerprint_version: string | null
          id: string
          ip_address: unknown | null
          last_seen_at: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          fingerprint: string
          fingerprint_components?: Json | null
          fingerprint_version?: string | null
          id?: string
          ip_address?: unknown | null
          last_seen_at?: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          fingerprint?: string
          fingerprint_components?: Json | null
          fingerprint_version?: string | null
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
      find_similar_devices: {
        Args: {
          target_components: Json
          min_confidence?: number
          similarity_threshold?: number
        }
        Returns: {
          user_id: string
          fingerprint: string
          similarity_score: number
          confidence_score: number
          last_seen_at: string
        }[]
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
      get_channel_membership_breakdown: {
        Args: Record<PropertyKey, never>
        Returns: {
          channel_name: string
          rank: number
          crown_count: number
          paypig_count: number
          cash_cow_count: number
          total_members_count: number
          total_usd_value: number
        }[]
      }
      get_enhanced_fingerprint_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_devices: number
          high_confidence_devices: number
          unique_users: number
          potential_duplicates: number
          avg_confidence: number
        }[]
      }
      get_guilds_for_user: {
        Args: { user_uuid: string }
        Returns: {
          guild_id: string
          guild_name: string
        }[]
      }
      get_order_mapping_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_printful_orders: number
          mapped_orders: number
          unmapped_orders: number
          normal_orders: number
          corrective_orders: number
          gift_orders: number
          mapping_percentage: number
        }[]
      }
      get_shared_fingerprint_details: {
        Args: Record<PropertyKey, never>
        Returns: {
          fingerprint: string
          user_count: number
          users: Json
          avg_confidence: number
          last_activity: string
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
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
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
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      sum_donations_by_channel_for_month_year: {
        Args: { p_month: string; p_year: string }
        Returns: {
          channel_name: string
          total_donations_sum: number
        }[]
      }
      sum_gifted_memberships_by_channel_for_month_year: {
        Args: { p_month: string; p_year: string }
        Returns: {
          channel_name: string
          total_gifted_memberships_sum: number
        }[]
      }
    }
    Enums: {
      link_status_enum:
        | "active"
        | "archived"
        | "broken_printful_deleted"
        | "broken_shopify_deleted"
        | "pending_verification"
      link_type_enum: "automatic" | "manual_system" | "manual_user_override"
      order_classification: "normal" | "corrective" | "gift"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      link_status_enum: [
        "active",
        "archived",
        "broken_printful_deleted",
        "broken_shopify_deleted",
        "pending_verification",
      ],
      link_type_enum: ["automatic", "manual_system", "manual_user_override"],
      order_classification: ["normal", "corrective", "gift"],
      user_role: ["admin", "user"],
    },
  },
} as const

