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
      achievements: {
        Row: {
          category: string
          created_at: string
          description: string
          description_en: string | null
          description_es: string | null
          icon: string
          id: string
          key: string
          name: string
          name_en: string | null
          name_es: string | null
          position: number
          rarity: string
          reward: string | null
          reward_en: string | null
          reward_es: string | null
          threshold: number | null
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          description_en?: string | null
          description_es?: string | null
          icon: string
          id?: string
          key: string
          name: string
          name_en?: string | null
          name_es?: string | null
          position?: number
          rarity?: string
          reward?: string | null
          reward_en?: string | null
          reward_es?: string | null
          threshold?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          description_en?: string | null
          description_es?: string | null
          icon?: string
          id?: string
          key?: string
          name?: string
          name_en?: string | null
          name_es?: string | null
          position?: number
          rarity?: string
          reward?: string | null
          reward_en?: string | null
          reward_es?: string | null
          threshold?: number | null
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          metadata: Json | null
          read_at: string | null
          related_user_id: string | null
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          read_at?: string | null
          related_user_id?: string | null
          title: string
          type: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          read_at?: string | null
          related_user_id?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      available_time_slots: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          label: string | null
          notes: string | null
          slot_type: string
          specific_date: string | null
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean
          label?: string | null
          notes?: string | null
          slot_type?: string
          specific_date?: string | null
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean
          label?: string | null
          notes?: string | null
          slot_type?: string
          specific_date?: string | null
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          category: string
          content: string | null
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          published: boolean
          published_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          category?: string
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published?: boolean
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          category?: string
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published?: boolean
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      body_measurements: {
        Row: {
          body_fat_pct: number | null
          created_at: string
          id: string
          measurement_date: string
          muscle_mass_kg: number | null
          notes: string | null
          updated_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          body_fat_pct?: number | null
          created_at?: string
          id?: string
          measurement_date?: string
          muscle_mass_kg?: number | null
          notes?: string | null
          updated_at?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          body_fat_pct?: number | null
          created_at?: string
          id?: string
          measurement_date?: string
          muscle_mass_kg?: number | null
          notes?: string | null
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      client_packages: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          notes: string | null
          package_name: string
          package_type: Database["public"]["Enums"]["package_type"]
          sessions_per_week: number | null
          start_date: string
          status: Database["public"]["Enums"]["package_status"]
          total_sessions: number | null
          updated_at: string
          used_sessions: number
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          package_name: string
          package_type: Database["public"]["Enums"]["package_type"]
          sessions_per_week?: number | null
          start_date?: string
          status?: Database["public"]["Enums"]["package_status"]
          total_sessions?: number | null
          updated_at?: string
          used_sessions?: number
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          package_name?: string
          package_type?: Database["public"]["Enums"]["package_type"]
          sessions_per_week?: number | null
          start_date?: string
          status?: Database["public"]["Enums"]["package_status"]
          total_sessions?: number | null
          updated_at?: string
          used_sessions?: number
          user_id?: string
        }
        Relationships: []
      }
      cta_events: {
        Row: {
          created_at: string
          cta_id: string
          id: string
          language: string | null
          metadata: Json | null
          page_path: string
          referrer: string | null
          viewport_width: number | null
        }
        Insert: {
          created_at?: string
          cta_id: string
          id?: string
          language?: string | null
          metadata?: Json | null
          page_path: string
          referrer?: string | null
          viewport_width?: number | null
        }
        Update: {
          created_at?: string
          cta_id?: string
          id?: string
          language?: string | null
          metadata?: Json | null
          page_path?: string
          referrer?: string | null
          viewport_width?: number | null
        }
        Relationships: []
      }
      cta_impressions: {
        Row: {
          created_at: string
          cta_id: string
          id: string
          language: string | null
          metadata: Json | null
          page_path: string
          referrer: string | null
          viewport_width: number | null
        }
        Insert: {
          created_at?: string
          cta_id: string
          id?: string
          language?: string | null
          metadata?: Json | null
          page_path: string
          referrer?: string | null
          viewport_width?: number | null
        }
        Update: {
          created_at?: string
          cta_id?: string
          id?: string
          language?: string | null
          metadata?: Json | null
          page_path?: string
          referrer?: string | null
          viewport_width?: number | null
        }
        Relationships: []
      }
      deletion_request_rate_limits: {
        Row: {
          created_at: string
          id: string
          ip_hash: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_hash: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_hash?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      exercises: {
        Row: {
          created_at: string
          description: string | null
          description_en: string | null
          description_es: string | null
          difficulty: Database["public"]["Enums"]["exercise_difficulty"]
          equipment: Database["public"]["Enums"]["equipment_type"]
          gif_url_1: string | null
          gif_url_2: string | null
          id: string
          image_url: string | null
          instructions: string | null
          instructions_en: string | null
          instructions_es: string | null
          name: string
          name_en: string | null
          name_es: string | null
          primary_muscle: Database["public"]["Enums"]["muscle_group"]
          secondary_muscles:
            | Database["public"]["Enums"]["muscle_group"][]
            | null
          slug: string
          tips: string | null
          tips_en: string | null
          tips_es: string | null
          updated_at: string
          video_url_1: string | null
          video_url_2: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          description_en?: string | null
          description_es?: string | null
          difficulty?: Database["public"]["Enums"]["exercise_difficulty"]
          equipment?: Database["public"]["Enums"]["equipment_type"]
          gif_url_1?: string | null
          gif_url_2?: string | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          instructions_en?: string | null
          instructions_es?: string | null
          name: string
          name_en?: string | null
          name_es?: string | null
          primary_muscle: Database["public"]["Enums"]["muscle_group"]
          secondary_muscles?:
            | Database["public"]["Enums"]["muscle_group"][]
            | null
          slug: string
          tips?: string | null
          tips_en?: string | null
          tips_es?: string | null
          updated_at?: string
          video_url_1?: string | null
          video_url_2?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          description_en?: string | null
          description_es?: string | null
          difficulty?: Database["public"]["Enums"]["exercise_difficulty"]
          equipment?: Database["public"]["Enums"]["equipment_type"]
          gif_url_1?: string | null
          gif_url_2?: string | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          instructions_en?: string | null
          instructions_es?: string | null
          name?: string
          name_en?: string | null
          name_es?: string | null
          primary_muscle?: Database["public"]["Enums"]["muscle_group"]
          secondary_muscles?:
            | Database["public"]["Enums"]["muscle_group"][]
            | null
          slug?: string
          tips?: string | null
          tips_en?: string | null
          tips_es?: string | null
          updated_at?: string
          video_url_1?: string | null
          video_url_2?: string | null
        }
        Relationships: []
      }
      intake_requests: {
        Row: {
          bericht: string | null
          created_at: string
          doel: string | null
          email: string
          id: string
          naam: string
          referrer_code: string | null
          selected_time_slot: string | null
          status: string
          telefoon: string
          voorkeur: string | null
        }
        Insert: {
          bericht?: string | null
          created_at?: string
          doel?: string | null
          email: string
          id?: string
          naam: string
          referrer_code?: string | null
          selected_time_slot?: string | null
          status?: string
          telefoon: string
          voorkeur?: string | null
        }
        Update: {
          bericht?: string | null
          created_at?: string
          doel?: string | null
          email?: string
          id?: string
          naam?: string
          referrer_code?: string | null
          selected_time_slot?: string | null
          status?: string
          telefoon?: string
          voorkeur?: string | null
        }
        Relationships: []
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      invites: {
        Row: {
          confirmed_at: string | null
          created_at: string
          id: string
          invite_type: string
          invitee_email: string | null
          invitee_name: string | null
          inviter_user_id: string
          source_booking_id: string | null
          source_intake_id: string | null
          source_purchase_id: string | null
          status: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          id?: string
          invite_type: string
          invitee_email?: string | null
          invitee_name?: string | null
          inviter_user_id: string
          source_booking_id?: string | null
          source_intake_id?: string | null
          source_purchase_id?: string | null
          status?: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          id?: string
          invite_type?: string
          invitee_email?: string | null
          invitee_name?: string | null
          inviter_user_id?: string
          source_booking_id?: string | null
          source_intake_id?: string | null
          source_purchase_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_source_booking_id_fkey"
            columns: ["source_booking_id"]
            isOneToOne: false
            referencedRelation: "pt_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_source_intake_id_fkey"
            columns: ["source_intake_id"]
            isOneToOne: false
            referencedRelation: "intake_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_source_purchase_id_fkey"
            columns: ["source_purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_consents: {
        Row: {
          consent_text: string
          created_at: string
          email: string
          granted: boolean
          granted_at: string
          id: string
          ip_address: string | null
          policy_version: string
          source: string
          user_agent: string | null
          user_id: string | null
          withdrawn_at: string | null
        }
        Insert: {
          consent_text: string
          created_at?: string
          email: string
          granted: boolean
          granted_at?: string
          id?: string
          ip_address?: string | null
          policy_version?: string
          source: string
          user_agent?: string | null
          user_id?: string | null
          withdrawn_at?: string | null
        }
        Update: {
          consent_text?: string
          created_at?: string
          email?: string
          granted?: boolean
          granted_at?: string
          id?: string
          ip_address?: string | null
          policy_version?: string
          source?: string
          user_agent?: string | null
          user_id?: string | null
          withdrawn_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          doel: string | null
          email: string | null
          geboortedatum: string | null
          geslacht: Database["public"]["Enums"]["gender"] | null
          gewicht_kg: number | null
          id: string
          lengte_cm: number | null
          naam: string | null
          telefoon: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          doel?: string | null
          email?: string | null
          geboortedatum?: string | null
          geslacht?: Database["public"]["Enums"]["gender"] | null
          gewicht_kg?: number | null
          id?: string
          lengte_cm?: number | null
          naam?: string | null
          telefoon?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          doel?: string | null
          email?: string | null
          geboortedatum?: string | null
          geslacht?: Database["public"]["Enums"]["gender"] | null
          gewicht_kg?: number | null
          id?: string
          lengte_cm?: number | null
          naam?: string | null
          telefoon?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      progress_photos: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          photo_date: string
          photo_type: Database["public"]["Enums"]["photo_type"]
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          photo_date?: string
          photo_type: Database["public"]["Enums"]["photo_type"]
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          photo_date?: string
          photo_type?: Database["public"]["Enums"]["photo_type"]
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      pt_bookings: {
        Row: {
          bericht: string | null
          created_at: string
          email: string
          id: string
          naam: string
          referrer_code: string | null
          selected_date: string
          selected_time_slot: string
          status: string
          telefoon: string
        }
        Insert: {
          bericht?: string | null
          created_at?: string
          email: string
          id?: string
          naam: string
          referrer_code?: string | null
          selected_date: string
          selected_time_slot: string
          status?: string
          telefoon: string
        }
        Update: {
          bericht?: string | null
          created_at?: string
          email?: string
          id?: string
          naam?: string
          referrer_code?: string | null
          selected_date?: string
          selected_time_slot?: string
          status?: string
          telefoon?: string
        }
        Relationships: []
      }
      pt_sessions: {
        Row: {
          created_at: string
          end_time: string | null
          id: string
          notes: string | null
          package_id: string | null
          session_date: string
          session_type: Database["public"]["Enums"]["session_type"]
          start_time: string
          status: Database["public"]["Enums"]["session_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          id?: string
          notes?: string | null
          package_id?: string | null
          session_date: string
          session_type?: Database["public"]["Enums"]["session_type"]
          start_time: string
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_time?: string | null
          id?: string
          notes?: string | null
          package_id?: string | null
          session_date?: string
          session_type?: Database["public"]["Enums"]["session_type"]
          start_time?: string
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pt_sessions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "client_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          amount: number
          created_at: string
          currency: string
          customer_email: string | null
          environment: string
          id: string
          product_name: string
          referrer_code: string | null
          status: string
          stripe_session_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          customer_email?: string | null
          environment?: string
          id?: string
          product_name: string
          referrer_code?: string | null
          status?: string
          stripe_session_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          customer_email?: string | null
          environment?: string
          id?: string
          product_name?: string
          referrer_code?: string | null
          status?: string
          stripe_session_id?: string | null
        }
        Relationships: []
      }
      rank_history: {
        Row: {
          created_at: string
          from_division: number | null
          from_tier: Database["public"]["Enums"]["rank_tier"] | null
          id: string
          to_division: number
          to_tier: Database["public"]["Enums"]["rank_tier"]
          total_score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          from_division?: number | null
          from_tier?: Database["public"]["Enums"]["rank_tier"] | null
          id?: string
          to_division: number
          to_tier: Database["public"]["Enums"]["rank_tier"]
          total_score: number
          user_id: string
        }
        Update: {
          created_at?: string
          from_division?: number | null
          from_tier?: Database["public"]["Enums"]["rank_tier"] | null
          id?: string
          to_division?: number
          to_tier?: Database["public"]["Enums"]["rank_tier"]
          total_score?: number
          user_id?: string
        }
        Relationships: []
      }
      runs: {
        Row: {
          created_at: string
          distance_km: number
          duration_seconds: number
          id: string
          notes: string | null
          pace_seconds_per_km: number | null
          perceived_effort: number | null
          route_name: string | null
          run_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          distance_km: number
          duration_seconds: number
          id?: string
          notes?: string | null
          pace_seconds_per_km?: number | null
          perceived_effort?: number | null
          route_name?: string | null
          run_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          distance_km?: number
          duration_seconds?: number
          id?: string
          notes?: string | null
          pace_seconds_per_km?: number | null
          perceived_effort?: number | null
          route_name?: string | null
          run_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_key: string
          claimed_at: string | null
          id: string
          progress_value: number | null
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_key: string
          claimed_at?: string | null
          id?: string
          progress_value?: number | null
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_key?: string
          claimed_at?: string | null
          id?: string
          progress_value?: number | null
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_ranks: {
        Row: {
          best_bench_e1rm: number | null
          best_deadlift_e1rm: number | null
          best_squat_e1rm: number | null
          bodyweight_snapshot: number | null
          created_at: string
          current_division: number
          current_tier: Database["public"]["Enums"]["rank_tier"]
          e1rm_score: number
          id: string
          last_calculated_at: string
          total_score: number
          updated_at: string
          user_id: string
          xp_score: number
          xp_total: number
        }
        Insert: {
          best_bench_e1rm?: number | null
          best_deadlift_e1rm?: number | null
          best_squat_e1rm?: number | null
          bodyweight_snapshot?: number | null
          created_at?: string
          current_division?: number
          current_tier?: Database["public"]["Enums"]["rank_tier"]
          e1rm_score?: number
          id?: string
          last_calculated_at?: string
          total_score?: number
          updated_at?: string
          user_id: string
          xp_score?: number
          xp_total?: number
        }
        Update: {
          best_bench_e1rm?: number | null
          best_deadlift_e1rm?: number | null
          best_squat_e1rm?: number | null
          bodyweight_snapshot?: number | null
          created_at?: string
          current_division?: number
          current_tier?: Database["public"]["Enums"]["rank_tier"]
          e1rm_score?: number
          id?: string
          last_calculated_at?: string
          total_score?: number
          updated_at?: string
          user_id?: string
          xp_score?: number
          xp_total?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workout_plan_exercises: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          notes: string | null
          plan_id: string
          position: number
          rest_seconds: number | null
          target_reps: string | null
          target_sets: number
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          notes?: string | null
          plan_id: string
          position?: number
          rest_seconds?: number | null
          target_reps?: string | null
          target_sets?: number
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          notes?: string | null
          plan_id?: string
          position?: number
          rest_seconds?: number | null
          target_reps?: string | null
          target_sets?: number
        }
        Relationships: [
          {
            foreignKeyName: "workout_plan_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_plan_exercises_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_plans: {
        Row: {
          created_at: string
          description: string | null
          description_en: string | null
          description_es: string | null
          difficulty: Database["public"]["Enums"]["exercise_difficulty"]
          estimated_duration_min: number | null
          focus: Database["public"]["Enums"]["workout_focus"]
          id: string
          is_premade: boolean
          name: string
          name_en: string | null
          name_es: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          description_en?: string | null
          description_es?: string | null
          difficulty?: Database["public"]["Enums"]["exercise_difficulty"]
          estimated_duration_min?: number | null
          focus?: Database["public"]["Enums"]["workout_focus"]
          id?: string
          is_premade?: boolean
          name: string
          name_en?: string | null
          name_es?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          description_en?: string | null
          description_es?: string | null
          difficulty?: Database["public"]["Enums"]["exercise_difficulty"]
          estimated_duration_min?: number | null
          focus?: Database["public"]["Enums"]["workout_focus"]
          id?: string
          is_premade?: boolean
          name?: string
          name_en?: string | null
          name_es?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      workout_sessions: {
        Row: {
          avg_heart_rate: number | null
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          hr_source: string | null
          id: string
          max_heart_rate: number | null
          notes: string | null
          perceived_intensity: number | null
          plan_id: string | null
          plan_name_snapshot: string | null
          session_date: string
          started_at: string
          training_mode: Database["public"]["Enums"]["training_mode"]
          user_id: string
        }
        Insert: {
          avg_heart_rate?: number | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          hr_source?: string | null
          id?: string
          max_heart_rate?: number | null
          notes?: string | null
          perceived_intensity?: number | null
          plan_id?: string | null
          plan_name_snapshot?: string | null
          session_date?: string
          started_at?: string
          training_mode?: Database["public"]["Enums"]["training_mode"]
          user_id: string
        }
        Update: {
          avg_heart_rate?: number | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          hr_source?: string | null
          id?: string
          max_heart_rate?: number | null
          notes?: string | null
          perceived_intensity?: number | null
          plan_id?: string | null
          plan_name_snapshot?: string | null
          session_date?: string
          started_at?: string
          training_mode?: Database["public"]["Enums"]["training_mode"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_set_logs: {
        Row: {
          completed_at: string
          exercise_id: string
          exercise_position: number
          id: string
          interval_rest_seconds: number | null
          interval_work_seconds: number | null
          is_interval: boolean
          notes: string | null
          reps: number | null
          rest_seconds: number | null
          session_id: string
          set_number: number
          weight_kg: number | null
        }
        Insert: {
          completed_at?: string
          exercise_id: string
          exercise_position?: number
          id?: string
          interval_rest_seconds?: number | null
          interval_work_seconds?: number | null
          is_interval?: boolean
          notes?: string | null
          reps?: number | null
          rest_seconds?: number | null
          session_id: string
          set_number?: number
          weight_kg?: number | null
        }
        Update: {
          completed_at?: string
          exercise_id?: string
          exercise_position?: number
          id?: string
          interval_rest_seconds?: number | null
          interval_work_seconds?: number | null
          is_interval?: boolean
          notes?: string | null
          reps?: number | null
          rest_seconds?: number | null
          session_id?: string
          set_number?: number
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_set_logs_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_set_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      marketing_consent_current: {
        Row: {
          email: string | null
          granted: boolean | null
          granted_at: string | null
          policy_version: string | null
          source: string | null
          user_id: string | null
          withdrawn_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      confirm_invite: { Args: { _invite_id: string }; Returns: undefined }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      generate_invite_code: { Args: { _seed?: string }; Returns: string }
      get_cta_stats: {
        Args: { _days?: number }
        Returns: {
          clicks_last_24h: number
          clicks_last_7d: number
          cta_id: string
          ctr_pct: number
          ctr_pct_7d: number
          impressions_last_24h: number
          impressions_last_7d: number
          last_click_at: string
          last_impression_at: string
          total_clicks: number
          total_impressions: number
        }[]
      }
      get_cta_variant_stats: {
        Args: { _days?: number }
        Returns: {
          cta_id: string
          ctr_pct: number
          total_clicks: number
          total_impressions: number
          variant: string
        }[]
      }
      get_leaderboard: {
        Args: { _gender?: string }
        Returns: {
          current_division: number
          current_tier: Database["public"]["Enums"]["rank_tier"]
          first_name: string
          rank_position: number
          total_score: number
        }[]
      }
      get_running_leaderboard: {
        Args: { _gender?: string }
        Returns: {
          best_pace_seconds: number
          first_name: string
          rank_position: number
          run_count: number
          total_km: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      resolve_invite_code: { Args: { _code: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "client"
      equipment_type:
        | "barbell"
        | "dumbbell"
        | "machine"
        | "cable"
        | "bodyweight"
        | "kettlebell"
        | "band"
        | "other"
      exercise_difficulty: "beginner" | "intermediate" | "advanced"
      gender: "man" | "vrouw" | "anders"
      muscle_group:
        | "chest"
        | "back"
        | "shoulders"
        | "biceps"
        | "triceps"
        | "forearms"
        | "abs"
        | "obliques"
        | "glutes"
        | "quads"
        | "hamstrings"
        | "calves"
        | "traps"
        | "lats"
        | "lower_back"
        | "full_body"
        | "cardio"
      package_status: "actief" | "verlopen" | "gepauzeerd"
      package_type: "maandkaart" | "rittenkaart"
      photo_type: "front" | "side" | "back"
      rank_tier:
        | "iron"
        | "bronze"
        | "silver"
        | "gold"
        | "platinum"
        | "diamond"
        | "master"
        | "elite"
        | "champion"
        | "olympian"
      session_status: "gepland" | "voltooid" | "no_show" | "geannuleerd"
      session_type: "pt_sessie" | "lichaamsmeting" | "small_group"
      training_mode:
        | "hypertrofie"
        | "powerlift"
        | "uithoudingsvermogen"
        | "interval"
      workout_focus:
        | "booty"
        | "chest"
        | "back"
        | "legs"
        | "shoulders"
        | "arms"
        | "push"
        | "pull"
        | "full_body"
        | "core"
        | "cardio"
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
      app_role: ["admin", "moderator", "user", "client"],
      equipment_type: [
        "barbell",
        "dumbbell",
        "machine",
        "cable",
        "bodyweight",
        "kettlebell",
        "band",
        "other",
      ],
      exercise_difficulty: ["beginner", "intermediate", "advanced"],
      gender: ["man", "vrouw", "anders"],
      muscle_group: [
        "chest",
        "back",
        "shoulders",
        "biceps",
        "triceps",
        "forearms",
        "abs",
        "obliques",
        "glutes",
        "quads",
        "hamstrings",
        "calves",
        "traps",
        "lats",
        "lower_back",
        "full_body",
        "cardio",
      ],
      package_status: ["actief", "verlopen", "gepauzeerd"],
      package_type: ["maandkaart", "rittenkaart"],
      photo_type: ["front", "side", "back"],
      rank_tier: [
        "iron",
        "bronze",
        "silver",
        "gold",
        "platinum",
        "diamond",
        "master",
        "elite",
        "champion",
        "olympian",
      ],
      session_status: ["gepland", "voltooid", "no_show", "geannuleerd"],
      session_type: ["pt_sessie", "lichaamsmeting", "small_group"],
      training_mode: [
        "hypertrofie",
        "powerlift",
        "uithoudingsvermogen",
        "interval",
      ],
      workout_focus: [
        "booty",
        "chest",
        "back",
        "legs",
        "shoulders",
        "arms",
        "push",
        "pull",
        "full_body",
        "core",
        "cardio",
      ],
    },
  },
} as const
