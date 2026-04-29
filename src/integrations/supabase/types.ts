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
      ad_settings: {
        Row: {
          adsense_publisher_id: string | null
          enabled: boolean
          id: boolean
          show_to_consumers: boolean
          show_to_free_owners: boolean
          show_to_subscribers: boolean
          updated_at: string
        }
        Insert: {
          adsense_publisher_id?: string | null
          enabled?: boolean
          id?: boolean
          show_to_consumers?: boolean
          show_to_free_owners?: boolean
          show_to_subscribers?: boolean
          updated_at?: string
        }
        Update: {
          adsense_publisher_id?: string | null
          enabled?: boolean
          id?: boolean
          show_to_consumers?: boolean
          show_to_free_owners?: boolean
          show_to_subscribers?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      ad_slots: {
        Row: {
          adsense_format: string
          adsense_slot_id: string | null
          created_at: string
          custom_image_url: string | null
          custom_link_url: string | null
          custom_title: string | null
          id: string
          is_active: boolean
          label: string
          mode: string
          slot_key: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          adsense_format?: string
          adsense_slot_id?: string | null
          created_at?: string
          custom_image_url?: string | null
          custom_link_url?: string | null
          custom_title?: string | null
          id?: string
          is_active?: boolean
          label: string
          mode?: string
          slot_key: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          adsense_format?: string
          adsense_slot_id?: string | null
          created_at?: string
          custom_image_url?: string | null
          custom_link_url?: string | null
          custom_title?: string | null
          id?: string
          is_active?: boolean
          label?: string
          mode?: string
          slot_key?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      affiliate_agents: {
        Row: {
          agent_referral_code: string
          agent_user_id: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          parent_affiliate_id: string
          phone: string
          status: string
          total_commission: number
          total_subscriptions: number
          updated_at: string
        }
        Insert: {
          agent_referral_code: string
          agent_user_id?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          parent_affiliate_id: string
          phone: string
          status?: string
          total_commission?: number
          total_subscriptions?: number
          updated_at?: string
        }
        Update: {
          agent_referral_code?: string
          agent_user_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          parent_affiliate_id?: string
          phone?: string
          status?: string
          total_commission?: number
          total_subscriptions?: number
          updated_at?: string
        }
        Relationships: []
      }
      affiliate_commissions: {
        Row: {
          affiliate_id: string
          commission_amount: number
          commission_pct: number
          created_at: string
          id: string
          paid_at: string | null
          referral_id: string | null
          status: string
          subscription_amount: number
        }
        Insert: {
          affiliate_id: string
          commission_amount?: number
          commission_pct?: number
          created_at?: string
          id?: string
          paid_at?: string | null
          referral_id?: string | null
          status?: string
          subscription_amount?: number
        }
        Update: {
          affiliate_id?: string
          commission_amount?: number
          commission_pct?: number
          created_at?: string
          id?: string
          paid_at?: string | null
          referral_id?: string | null
          status?: string
          subscription_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "affiliate_referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_marketing_assets: {
        Row: {
          body: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          sort_order: number
          title: string
          type: string
          url: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number
          title: string
          type: string
          url?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number
          title?: string
          type?: string
          url?: string | null
        }
        Relationships: []
      }
      affiliate_payout_methods: {
        Row: {
          fee_pct: number
          id: string
          is_active: boolean
          key: string
          label_bn: string
          label_en: string
          max_amount: number
          min_amount: number
          sort_order: number
        }
        Insert: {
          fee_pct?: number
          id?: string
          is_active?: boolean
          key: string
          label_bn: string
          label_en: string
          max_amount?: number
          min_amount?: number
          sort_order?: number
        }
        Update: {
          fee_pct?: number
          id?: string
          is_active?: boolean
          key?: string
          label_bn?: string
          label_en?: string
          max_amount?: number
          min_amount?: number
          sort_order?: number
        }
        Relationships: []
      }
      affiliate_referrals: {
        Row: {
          affiliate_id: string
          converted_at: string | null
          created_at: string
          id: string
          referral_code: string
          referred_shop_id: string | null
          referred_user_id: string | null
          status: string
        }
        Insert: {
          affiliate_id: string
          converted_at?: string | null
          created_at?: string
          id?: string
          referral_code: string
          referred_shop_id?: string | null
          referred_user_id?: string | null
          status?: string
        }
        Update: {
          affiliate_id?: string
          converted_at?: string | null
          created_at?: string
          id?: string
          referral_code?: string
          referred_shop_id?: string | null
          referred_user_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_referrals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_referrals_referred_shop_id_fkey"
            columns: ["referred_shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_settings: {
        Row: {
          agent_override_pct: number
          auto_tier_upgrade: boolean
          default_commission_pct: number
          facebook_url: string | null
          id: boolean
          is_program_active: boolean
          lifetime_commission_pct: number
          live_chat_url: string | null
          max_withdrawal_per_month: number
          min_withdrawal_amount: number
          password_reset_whatsapp: string | null
          referee_discount_pct: number
          subscription_pay_enabled: boolean
          support_email: string | null
          support_phone: string | null
          updated_at: string
          whatsapp_number: string | null
          youtube_url: string | null
        }
        Insert: {
          agent_override_pct?: number
          auto_tier_upgrade?: boolean
          default_commission_pct?: number
          facebook_url?: string | null
          id?: boolean
          is_program_active?: boolean
          lifetime_commission_pct?: number
          live_chat_url?: string | null
          max_withdrawal_per_month?: number
          min_withdrawal_amount?: number
          password_reset_whatsapp?: string | null
          referee_discount_pct?: number
          subscription_pay_enabled?: boolean
          support_email?: string | null
          support_phone?: string | null
          updated_at?: string
          whatsapp_number?: string | null
          youtube_url?: string | null
        }
        Update: {
          agent_override_pct?: number
          auto_tier_upgrade?: boolean
          default_commission_pct?: number
          facebook_url?: string | null
          id?: boolean
          is_program_active?: boolean
          lifetime_commission_pct?: number
          live_chat_url?: string | null
          max_withdrawal_per_month?: number
          min_withdrawal_amount?: number
          password_reset_whatsapp?: string | null
          referee_discount_pct?: number
          subscription_pay_enabled?: boolean
          support_email?: string | null
          support_phone?: string | null
          updated_at?: string
          whatsapp_number?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      affiliate_support_messages: {
        Row: {
          affiliate_id: string | null
          created_at: string
          email: string | null
          id: string
          message: string
          name: string
          status: string
          subject: string | null
        }
        Insert: {
          affiliate_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          message: string
          name: string
          status?: string
          subject?: string | null
        }
        Update: {
          affiliate_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          message?: string
          name?: string
          status?: string
          subject?: string | null
        }
        Relationships: []
      }
      affiliate_tiers: {
        Row: {
          bonus_pct: number
          color: string | null
          commission_pct: number
          created_at: string
          id: string
          min_sales: number
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          bonus_pct?: number
          color?: string | null
          commission_pct?: number
          created_at?: string
          id?: string
          min_sales?: number
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          bonus_pct?: number
          color?: string | null
          commission_pct?: number
          created_at?: string
          id?: string
          min_sales?: number
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      affiliate_wallet: {
        Row: {
          affiliate_id: string
          available_balance: number
          lifetime_earned: number
          lifetime_spent_on_subscription: number
          lifetime_withdrawn: number
          pending_balance: number
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          available_balance?: number
          lifetime_earned?: number
          lifetime_spent_on_subscription?: number
          lifetime_withdrawn?: number
          pending_balance?: number
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          available_balance?: number
          lifetime_earned?: number
          lifetime_spent_on_subscription?: number
          lifetime_withdrawn?: number
          pending_balance?: number
          updated_at?: string
        }
        Relationships: []
      }
      affiliate_wallet_transactions: {
        Row: {
          affiliate_id: string
          amount: number
          balance_after: number
          created_at: string
          id: string
          note: string | null
          reference_id: string | null
          type: string
        }
        Insert: {
          affiliate_id: string
          amount: number
          balance_after?: number
          created_at?: string
          id?: string
          note?: string | null
          reference_id?: string | null
          type: string
        }
        Update: {
          affiliate_id?: string
          amount?: number
          balance_after?: number
          created_at?: string
          id?: string
          note?: string | null
          reference_id?: string | null
          type?: string
        }
        Relationships: []
      }
      affiliate_withdrawals: {
        Row: {
          account_name: string | null
          account_number: string
          admin_note: string | null
          affiliate_id: string
          amount: number
          id: string
          method: string
          processed_at: string | null
          processed_by: string | null
          requested_at: string
          status: string
          transaction_ref: string | null
        }
        Insert: {
          account_name?: string | null
          account_number: string
          admin_note?: string | null
          affiliate_id: string
          amount: number
          id?: string
          method: string
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string
          status?: string
          transaction_ref?: string | null
        }
        Update: {
          account_name?: string | null
          account_number?: string
          admin_note?: string | null
          affiliate_id?: string
          amount?: number
          id?: string
          method?: string
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string
          status?: string
          transaction_ref?: string | null
        }
        Relationships: []
      }
      affiliates: {
        Row: {
          created_at: string
          current_tier_id: string | null
          email: string | null
          full_name: string
          id: string
          phone: string
          referral_code: string
          status: string
          total_commission: number
          total_referrals: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_tier_id?: string | null
          email?: string | null
          full_name: string
          id?: string
          phone: string
          referral_code: string
          status?: string
          total_commission?: number
          total_referrals?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_tier_id?: string | null
          email?: string | null
          full_name?: string
          id?: string
          phone?: string
          referral_code?: string
          status?: string
          total_commission?: number
          total_referrals?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliates_current_tier_id_fkey"
            columns: ["current_tier_id"]
            isOneToOne: false
            referencedRelation: "affiliate_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      app_links: {
        Row: {
          created_at: string
          icon: string
          is_active: boolean
          key: string
          label_bn: string
          label_en: string
          link_type: string
          section: string
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          icon?: string
          is_active?: boolean
          key: string
          label_bn: string
          label_en: string
          link_type?: string
          section?: string
          sort_order?: number
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          icon?: string
          is_active?: boolean
          key?: string
          label_bn?: string
          label_en?: string
          link_type?: string
          section?: string
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          disposed_at: string | null
          disposed_value: number
          id: string
          image_url: string | null
          name: string
          note: string | null
          paid_via: Database["public"]["Enums"]["payment_method"]
          purchase_date: string
          purchase_price: number
          quantity: number
          shop_id: string
          status: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          disposed_at?: string | null
          disposed_value?: number
          id?: string
          image_url?: string | null
          name: string
          note?: string | null
          paid_via?: Database["public"]["Enums"]["payment_method"]
          purchase_date?: string
          purchase_price?: number
          quantity?: number
          shop_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          disposed_at?: string | null
          disposed_value?: number
          id?: string
          image_url?: string | null
          name?: string
          note?: string | null
          paid_via?: Database["public"]["Enums"]["payment_method"]
          purchase_date?: string
          purchase_price?: number
          quantity?: number
          shop_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      bd_districts: {
        Row: {
          created_at: string
          division_legacy_id: string
          id: string
          is_active: boolean
          legacy_id: string | null
          name_bn: string
          name_en: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          division_legacy_id: string
          id?: string
          is_active?: boolean
          legacy_id?: string | null
          name_bn: string
          name_en: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          division_legacy_id?: string
          id?: string
          is_active?: boolean
          legacy_id?: string | null
          name_bn?: string
          name_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      bd_divisions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          legacy_id: string | null
          name_bn: string
          name_en: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          legacy_id?: string | null
          name_bn: string
          name_en: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          legacy_id?: string | null
          name_bn?: string
          name_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      bd_upazilas: {
        Row: {
          created_at: string
          district_legacy_id: string
          id: string
          is_active: boolean
          legacy_id: string | null
          name_bn: string
          name_en: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          district_legacy_id: string
          id?: string
          is_active?: boolean
          legacy_id?: string | null
          name_bn: string
          name_en: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          district_legacy_id?: string
          id?: string
          is_active?: boolean
          legacy_id?: string | null
          name_bn?: string
          name_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      cash_movements: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          denominations: Json
          direction: string
          id: string
          note: string | null
          ref_id: string | null
          ref_table: string | null
          shop_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          denominations?: Json
          direction: string
          id?: string
          note?: string | null
          ref_id?: string | null
          ref_table?: string | null
          shop_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          denominations?: Json
          direction?: string
          id?: string
          note?: string | null
          ref_id?: string | null
          ref_table?: string | null
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_movements_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_id: string | null
          shop_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          shop_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          shop_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      consumer_favourite_shops: {
        Row: {
          consumer_id: string
          created_at: string
          id: string
          shop_id: string
        }
        Insert: {
          consumer_id: string
          created_at?: string
          id?: string
          shop_id: string
        }
        Update: {
          consumer_id?: string
          created_at?: string
          id?: string
          shop_id?: string
        }
        Relationships: []
      }
      consumer_fordo_schedules: {
        Row: {
          consumer_user_id: string
          created_at: string
          day_of_month: number | null
          day_of_week: number | null
          id: string
          is_active: boolean
          items: Json
          last_run_at: string | null
          next_run_at: string
          note: string | null
          recurrence: string
          run_at: string | null
          shop_id: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          consumer_user_id: string
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          id?: string
          is_active?: boolean
          items?: Json
          last_run_at?: string | null
          next_run_at: string
          note?: string | null
          recurrence: string
          run_at?: string | null
          shop_id: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          consumer_user_id?: string
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          id?: string
          is_active?: boolean
          items?: Json
          last_run_at?: string | null
          next_run_at?: string
          note?: string | null
          recurrence?: string
          run_at?: string | null
          shop_id?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consumer_fordo_schedules_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumer_fordo_schedules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "consumer_fordo_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      consumer_fordo_templates: {
        Row: {
          consumer_user_id: string
          created_at: string
          id: string
          items: Json
          name: string
          note: string | null
          updated_at: string
        }
        Insert: {
          consumer_user_id: string
          created_at?: string
          id?: string
          items?: Json
          name: string
          note?: string | null
          updated_at?: string
        }
        Update: {
          consumer_user_id?: string
          created_at?: string
          id?: string
          items?: Json
          name?: string
          note?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      consumer_notes: {
        Row: {
          content: string | null
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      consumer_profiles: {
        Row: {
          address: string | null
          area: string | null
          avatar_url: string | null
          created_at: string
          default_lat: number | null
          default_lng: number | null
          district: string | null
          division: string | null
          id: string
          name: string
          phone: string
          pin_hash: string | null
          upazila: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          area?: string | null
          avatar_url?: string | null
          created_at?: string
          default_lat?: number | null
          default_lng?: number | null
          district?: string | null
          division?: string | null
          id: string
          name: string
          phone: string
          pin_hash?: string | null
          upazila?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          area?: string | null
          avatar_url?: string | null
          created_at?: string
          default_lat?: number | null
          default_lng?: number | null
          district?: string | null
          division?: string | null
          id?: string
          name?: string
          phone?: string
          pin_hash?: string | null
          upazila?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      consumer_saved_carts: {
        Row: {
          consumer_user_id: string
          created_at: string
          id: string
          items: Json
          name: string
          updated_at: string
        }
        Insert: {
          consumer_user_id: string
          created_at?: string
          id?: string
          items?: Json
          name: string
          updated_at?: string
        }
        Update: {
          consumer_user_id?: string
          created_at?: string
          id?: string
          items?: Json
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      consumer_transactions: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          id: string
          note: string | null
          tx_date: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          id?: string
          note?: string | null
          tx_date?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          id?: string
          note?: string | null
          tx_date?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_reminder_log: {
        Row: {
          amount: number
          channel: string
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          message: string | null
          shop_id: string
        }
        Insert: {
          amount?: number
          channel: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          message?: string | null
          shop_id: string
        }
        Update: {
          amount?: number
          channel?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          message?: string | null
          shop_id?: string
        }
        Relationships: []
      }
      customer_wishlist_items: {
        Row: {
          created_at: string
          done: boolean
          fulfillment_status: string
          id: string
          name: string
          position: number
          price: number | null
          qty: number | null
          shopkeeper_note: string | null
          unit: string | null
          wishlist_id: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          fulfillment_status?: string
          id?: string
          name: string
          position?: number
          price?: number | null
          qty?: number | null
          shopkeeper_note?: string | null
          unit?: string | null
          wishlist_id: string
        }
        Update: {
          created_at?: string
          done?: boolean
          fulfillment_status?: string
          id?: string
          name?: string
          position?: number
          price?: number | null
          qty?: number | null
          shopkeeper_note?: string | null
          unit?: string | null
          wishlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_wishlist_items_wishlist_id_fkey"
            columns: ["wishlist_id"]
            isOneToOne: false
            referencedRelation: "customer_wishlists"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_wishlists: {
        Row: {
          buyer_shop_id: string | null
          color: string
          consumer_user_id: string | null
          converted_sale_id: string | null
          created_at: string
          customer_address: string | null
          customer_name: string
          customer_phone: string
          deleted_at: string | null
          id: string
          is_b2b: boolean
          note: string | null
          shop_id: string
          status: string
          updated_at: string
          wishlist_customer_id: string | null
        }
        Insert: {
          buyer_shop_id?: string | null
          color?: string
          consumer_user_id?: string | null
          converted_sale_id?: string | null
          created_at?: string
          customer_address?: string | null
          customer_name: string
          customer_phone: string
          deleted_at?: string | null
          id?: string
          is_b2b?: boolean
          note?: string | null
          shop_id: string
          status?: string
          updated_at?: string
          wishlist_customer_id?: string | null
        }
        Update: {
          buyer_shop_id?: string | null
          color?: string
          consumer_user_id?: string | null
          converted_sale_id?: string | null
          created_at?: string
          customer_address?: string | null
          customer_name?: string
          customer_phone?: string
          deleted_at?: string | null
          id?: string
          is_b2b?: boolean
          note?: string | null
          shop_id?: string
          status?: string
          updated_at?: string
          wishlist_customer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_wishlists_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          deleted_at: string | null
          due_balance: number
          id: string
          name: string
          phone: string | null
          shop_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          deleted_at?: string | null
          due_balance?: number
          id?: string
          name: string
          phone?: string | null
          shop_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          deleted_at?: string | null
          due_balance?: number
          id?: string
          name?: string
          phone?: string | null
          shop_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_banners: {
        Row: {
          created_at: string
          id: string
          image_url: string
          is_active: boolean
          link_url: string | null
          sort_order: number
          title_bn: string | null
          title_en: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          is_active?: boolean
          link_url?: string | null
          sort_order?: number
          title_bn?: string | null
          title_en?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean
          link_url?: string | null
          sort_order?: number
          title_bn?: string | null
          title_en?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          note: string | null
          paid_via: Database["public"]["Enums"]["payment_method"]
          shop_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          note?: string | null
          paid_via?: Database["public"]["Enums"]["payment_method"]
          shop_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          note?: string | null
          paid_via?: Database["public"]["Enums"]["payment_method"]
          shop_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_check_logs: {
        Row: {
          checked_at: string
          id: string
          phone: string
          result: Json | null
          shop_id: string
        }
        Insert: {
          checked_at?: string
          id?: string
          phone: string
          result?: Json | null
          shop_id: string
        }
        Update: {
          checked_at?: string
          id?: string
          phone?: string
          result?: Json | null
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fraud_check_logs_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_listings: {
        Row: {
          created_at: string
          id: string
          is_featured: boolean
          is_published: boolean
          min_order: number | null
          price: number
          product_id: string
          seller_id: string
          shop_id: string
          stock: number
          unit: string | null
          updated_at: string
          warranty_months: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_featured?: boolean
          is_published?: boolean
          min_order?: number | null
          price?: number
          product_id: string
          seller_id: string
          shop_id: string
          stock?: number
          unit?: string | null
          updated_at?: string
          warranty_months?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_featured?: boolean
          is_published?: boolean
          min_order?: number | null
          price?: number
          product_id?: string
          seller_id?: string
          shop_id?: string
          stock?: number
          unit?: string | null
          updated_at?: string
          warranty_months?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_listings_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_order_items: {
        Row: {
          created_at: string
          id: string
          listing_id: string | null
          name: string
          order_id: string
          price: number
          product_id: string | null
          qty: number
          total: number
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id?: string | null
          name: string
          order_id: string
          price?: number
          product_id?: string | null
          qty?: number
          total?: number
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string | null
          name?: string
          order_id?: string
          price?: number
          product_id?: string | null
          qty?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "marketplace_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_orders: {
        Row: {
          created_at: string
          customer_address: string | null
          customer_name: string
          customer_phone: string
          id: string
          note: string | null
          order_no: string | null
          payment_method: string | null
          shop_id: string
          status: string
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_address?: string | null
          customer_name: string
          customer_phone: string
          id?: string
          note?: string | null
          order_no?: string | null
          payment_method?: string | null
          shop_id: string
          status?: string
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_address?: string | null
          customer_name?: string
          customer_phone?: string
          id?: string
          note?: string | null
          order_no?: string | null
          payment_method?: string | null
          shop_id?: string
          status?: string
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      marketplace_products: {
        Row: {
          barcode: string | null
          base_unit: string | null
          brand: string | null
          category: string | null
          created_at: string
          created_by: string | null
          default_cost: number | null
          default_price: number | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name_bn: string
          name_en: string
          pack_size: string | null
          search_text: string | null
          shop_types: string[]
          slug: string
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          base_unit?: string | null
          brand?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          default_cost?: number | null
          default_price?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name_bn: string
          name_en: string
          pack_size?: string | null
          search_text?: string | null
          shop_types?: string[]
          slug: string
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          base_unit?: string | null
          brand?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          default_cost?: number | null
          default_price?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name_bn?: string
          name_en?: string
          pack_size?: string | null
          search_text?: string | null
          shop_types?: string[]
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          telegram: boolean
          telegram_chat_id: string | null
          updated_at: string
          user_id: string
          whatsapp: boolean
          whatsapp_number: string | null
        }
        Insert: {
          telegram?: boolean
          telegram_chat_id?: string | null
          updated_at?: string
          user_id: string
          whatsapp?: boolean
          whatsapp_number?: string | null
        }
        Update: {
          telegram?: boolean
          telegram_chat_id?: string | null
          updated_at?: string
          user_id?: string
          whatsapp?: boolean
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      other_income: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          note: string | null
          paid_via: Database["public"]["Enums"]["payment_method"]
          shop_id: string
          source: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          note?: string | null
          paid_via?: Database["public"]["Enums"]["payment_method"]
          shop_id: string
          source?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          note?: string | null
          paid_via?: Database["public"]["Enums"]["payment_method"]
          shop_id?: string
          source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      owner_transactions: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          deleted_at: string | null
          direction: string
          id: string
          note: string | null
          paid_via: Database["public"]["Enums"]["payment_method"]
          shop_id: string
          tx_date: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          direction: string
          id?: string
          note?: string | null
          paid_via?: Database["public"]["Enums"]["payment_method"]
          shop_id: string
          tx_date?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          direction?: string
          id?: string
          note?: string | null
          paid_via?: Database["public"]["Enums"]["payment_method"]
          shop_id?: string
          tx_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_gateway_settings: {
        Row: {
          api_url: string | null
          extra: Json
          id: boolean
          is_enabled: boolean
          merchant_id: string | null
          provider: string
          updated_at: string
        }
        Insert: {
          api_url?: string | null
          extra?: Json
          id?: boolean
          is_enabled?: boolean
          merchant_id?: string | null
          provider?: string
          updated_at?: string
        }
        Update: {
          api_url?: string | null
          extra?: Json
          id?: boolean
          is_enabled?: boolean
          merchant_id?: string | null
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          account_holder: string | null
          account_number: string
          color: string
          created_at: string
          extra_info: string | null
          icon_emoji: string | null
          id: string
          instructions_bn: string | null
          instructions_en: string | null
          is_active: boolean
          name: string
          sort_order: number
          type: string
          updated_at: string
        }
        Insert: {
          account_holder?: string | null
          account_number?: string
          color?: string
          created_at?: string
          extra_info?: string | null
          icon_emoji?: string | null
          id?: string
          instructions_bn?: string | null
          instructions_en?: string | null
          is_active?: boolean
          name: string
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Update: {
          account_holder?: string | null
          account_number?: string
          color?: string
          created_at?: string
          extra_info?: string | null
          icon_emoji?: string | null
          id?: string
          instructions_bn?: string | null
          instructions_en?: string | null
          is_active?: boolean
          name?: string
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string
          failure_reason: string | null
          id: string
          payment_method: string | null
          plan_id: string | null
          provider: string
          raw_response: Json
          status: string
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          failure_reason?: string | null
          id?: string
          payment_method?: string | null
          plan_id?: string | null
          provider?: string
          raw_response?: Json
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          failure_reason?: string | null
          id?: string
          payment_method?: string | null
          plan_id?: string | null
          provider?: string
          raw_response?: Json
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          customer_id: string | null
          direction: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          note: string | null
          shop_id: string
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          direction: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          shop_id: string
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          direction?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          shop_id?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_serials: {
        Row: {
          cost_price: number
          created_at: string
          id: string
          imei2: string | null
          note: string | null
          product_id: string
          sale_id: string | null
          sale_item_id: string | null
          serial_no: string
          shop_id: string
          status: Database["public"]["Enums"]["serial_status"]
          updated_at: string
          warranty_until: string | null
        }
        Insert: {
          cost_price?: number
          created_at?: string
          id?: string
          imei2?: string | null
          note?: string | null
          product_id: string
          sale_id?: string | null
          sale_item_id?: string | null
          serial_no: string
          shop_id: string
          status?: Database["public"]["Enums"]["serial_status"]
          updated_at?: string
          warranty_until?: string | null
        }
        Update: {
          cost_price?: number
          created_at?: string
          id?: string
          imei2?: string | null
          note?: string | null
          product_id?: string
          sale_id?: string | null
          sale_item_id?: string | null
          serial_no?: string
          shop_id?: string
          status?: Database["public"]["Enums"]["serial_status"]
          updated_at?: string
          warranty_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_serials_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          bulk_enabled: boolean
          bulk_min_qty: number | null
          bulk_price: number | null
          category_id: string | null
          cost_price: number
          created_at: string
          deleted_at: string | null
          description: string | null
          discount_enabled: boolean
          discount_type: string | null
          discount_value: number | null
          expiry_date: string | null
          id: string
          image_url: string | null
          is_featured: boolean
          is_marketplace_published: boolean
          is_serialized: boolean
          low_stock_alert: number | null
          manufacturing_date: string | null
          name: string
          sale_price: number
          shop_id: string
          sku: string | null
          stock: number
          sub_category_id: string | null
          unit: string | null
          updated_at: string
          vat_enabled: boolean
          vat_pct: number | null
          warranty_enabled: boolean
          warranty_unit: string | null
          warranty_value: number | null
        }
        Insert: {
          barcode?: string | null
          bulk_enabled?: boolean
          bulk_min_qty?: number | null
          bulk_price?: number | null
          category_id?: string | null
          cost_price?: number
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          discount_enabled?: boolean
          discount_type?: string | null
          discount_value?: number | null
          expiry_date?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_marketplace_published?: boolean
          is_serialized?: boolean
          low_stock_alert?: number | null
          manufacturing_date?: string | null
          name: string
          sale_price?: number
          shop_id: string
          sku?: string | null
          stock?: number
          sub_category_id?: string | null
          unit?: string | null
          updated_at?: string
          vat_enabled?: boolean
          vat_pct?: number | null
          warranty_enabled?: boolean
          warranty_unit?: string | null
          warranty_value?: number | null
        }
        Update: {
          barcode?: string | null
          bulk_enabled?: boolean
          bulk_min_qty?: number | null
          bulk_price?: number | null
          category_id?: string | null
          cost_price?: number
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          discount_enabled?: boolean
          discount_type?: string | null
          discount_value?: number | null
          expiry_date?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_marketplace_published?: boolean
          is_serialized?: boolean
          low_stock_alert?: number | null
          manufacturing_date?: string | null
          name?: string
          sale_price?: number
          shop_id?: string
          sku?: string | null
          stock?: number
          sub_category_id?: string | null
          unit?: string | null
          updated_at?: string
          vat_enabled?: boolean
          vat_pct?: number | null
          warranty_enabled?: boolean
          warranty_unit?: string | null
          warranty_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_sub_category_id_fkey"
            columns: ["sub_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          is_suspended: boolean
          language: string
          phone: string | null
          pin_hash: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          is_suspended?: boolean
          language?: string
          phone?: string | null
          pin_hash?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_suspended?: boolean
          language?: string
          phone?: string | null
          pin_hash?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          min_order_amount: number
          shop_id: string
          starts_at: string | null
          updated_at: string
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number
          shop_id: string
          starts_at?: string | null
          updated_at?: string
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number
          shop_id?: string
          starts_at?: string | null
          updated_at?: string
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_popups: {
        Row: {
          body_bn: string | null
          body_en: string | null
          created_at: string
          cta_link: string | null
          cta_text_bn: string | null
          cta_text_en: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          starts_at: string | null
          title_bn: string | null
          title_en: string | null
          updated_at: string
        }
        Insert: {
          body_bn?: string | null
          body_en?: string | null
          created_at?: string
          cta_link?: string | null
          cta_text_bn?: string | null
          cta_text_en?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          starts_at?: string | null
          title_bn?: string | null
          title_en?: string | null
          updated_at?: string
        }
        Update: {
          body_bn?: string | null
          body_en?: string | null
          created_at?: string
          cta_link?: string | null
          cta_text_bn?: string | null
          cta_text_en?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          starts_at?: string | null
          title_bn?: string | null
          title_en?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      purchase_items: {
        Row: {
          created_at: string
          id: string
          name: string
          price: number
          product_id: string | null
          purchase_id: string
          qty: number
          total: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          price: number
          product_id?: string | null
          purchase_id: string
          qty: number
          total: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          price?: number
          product_id?: string | null
          purchase_id?: string
          qty?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          discount: number
          due: number
          id: string
          invoice_no: string | null
          note: string | null
          paid: number
          payment_method: Database["public"]["Enums"]["payment_method"]
          shop_id: string
          subtotal: number
          supplier_id: string | null
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          discount?: number
          due?: number
          id?: string
          invoice_no?: string | null
          note?: string | null
          paid?: number
          payment_method?: Database["public"]["Enums"]["payment_method"]
          shop_id: string
          subtotal?: number
          supplier_id?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          discount?: number
          due?: number
          id?: string
          invoice_no?: string | null
          note?: string | null
          paid?: number
          payment_method?: Database["public"]["Enums"]["payment_method"]
          shop_id?: string
          subtotal?: number
          supplier_id?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_adjustments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          customer_id: string | null
          id: string
          note: string | null
          sale_id: string
          shop_id: string
          type: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          note?: string | null
          sale_id: string
          shop_id: string
          type?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          note?: string | null
          sale_id?: string
          shop_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_adjustments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_adjustments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_adjustments_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          created_at: string
          id: string
          name: string
          price: number
          product_id: string | null
          qty: number
          sale_id: string
          serial_id: string | null
          total: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          price: number
          product_id?: string | null
          qty: number
          sale_id: string
          serial_id?: string | null
          total: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          price?: number
          product_id?: string | null
          qty?: number
          sale_id?: string
          serial_id?: string | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_return_items: {
        Row: {
          created_at: string
          id: string
          name: string
          price: number
          product_id: string | null
          qty: number
          return_id: string
          total: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          price?: number
          product_id?: string | null
          qty?: number
          return_id: string
          total?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          price?: number
          product_id?: string | null
          qty?: number
          return_id?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "sale_returns"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_returns: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          deleted_at: string | null
          id: string
          note: string | null
          reason: string | null
          reason_note: string | null
          refund_amount: number
          refund_method: Database["public"]["Enums"]["payment_method"]
          refund_status: string
          restock: boolean
          return_no: string | null
          sale_id: string | null
          shop_id: string
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          id?: string
          note?: string | null
          reason?: string | null
          reason_note?: string | null
          refund_amount?: number
          refund_method?: Database["public"]["Enums"]["payment_method"]
          refund_status?: string
          restock?: boolean
          return_no?: string | null
          sale_id?: string | null
          shop_id: string
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          id?: string
          note?: string | null
          reason?: string | null
          reason_note?: string | null
          refund_amount?: number
          refund_method?: Database["public"]["Enums"]["payment_method"]
          refund_status?: string
          restock?: boolean
          return_no?: string | null
          sale_id?: string | null
          shop_id?: string
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          deleted_at: string | null
          discount: number
          due: number
          id: string
          invoice_no: string | null
          note: string | null
          paid: number
          payment_method: Database["public"]["Enums"]["payment_method"]
          shop_id: string
          status: Database["public"]["Enums"]["sale_status"]
          subtotal: number
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          discount?: number
          due?: number
          id?: string
          invoice_no?: string | null
          note?: string | null
          paid?: number
          payment_method?: Database["public"]["Enums"]["payment_method"]
          shop_id: string
          status?: Database["public"]["Enums"]["sale_status"]
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          discount?: number
          due?: number
          id?: string
          invoice_no?: string | null
          note?: string | null
          paid?: number
          payment_method?: Database["public"]["Enums"]["payment_method"]
          shop_id?: string
          status?: Database["public"]["Enums"]["sale_status"]
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_locations: {
        Row: {
          area: string | null
          district: string | null
          division: string | null
          lat: number | null
          lng: number | null
          shop_id: string
          upazila: string | null
          updated_at: string
        }
        Insert: {
          area?: string | null
          district?: string | null
          division?: string | null
          lat?: number | null
          lng?: number | null
          shop_id: string
          upazila?: string | null
          updated_at?: string
        }
        Update: {
          area?: string | null
          district?: string | null
          division?: string | null
          lat?: number | null
          lng?: number | null
          shop_id?: string
          upazila?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_locations_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: true
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_packages: {
        Row: {
          area_type: string
          created_at: string
          delivery_time: string | null
          id: string
          is_active: boolean
          name: string
          price: number
          shop_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          area_type?: string
          created_at?: string
          delivery_time?: string | null
          id?: string
          is_active?: boolean
          name: string
          price?: number
          shop_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          area_type?: string
          created_at?: string
          delivery_time?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          shop_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_packages_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_custom_roles: {
        Row: {
          created_at: string
          id: string
          name: string
          permissions: Json
          shop_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          permissions?: Json
          shop_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          permissions?: Json
          shop_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_custom_roles_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_delivery_zones: {
        Row: {
          charge: number
          created_at: string
          free_shipping_min: number | null
          id: string
          is_active: boolean
          name: string
          shop_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          charge?: number
          created_at?: string
          free_shipping_min?: number | null
          id?: string
          is_active?: boolean
          name: string
          shop_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          charge?: number
          created_at?: string
          free_shipping_min?: number | null
          id?: string
          is_active?: boolean
          name?: string
          shop_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      shop_members: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          custom_role_id: string | null
          email: string | null
          full_name: string | null
          id: string
          permissions: Json
          role: Database["public"]["Enums"]["app_role"]
          shop_id: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          custom_role_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          permissions?: Json
          role?: Database["public"]["Enums"]["app_role"]
          shop_id: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          custom_role_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          permissions?: Json
          role?: Database["public"]["Enums"]["app_role"]
          shop_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_members_custom_role_id_fkey"
            columns: ["custom_role_id"]
            isOneToOne: false
            referencedRelation: "shop_custom_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_members_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_printer_settings: {
        Row: {
          created_at: string
          font_size: number
          footer_text: string | null
          id: string
          language: string
          paper_size: string | null
          print_delivery: boolean
          print_discount: boolean
          print_prev_due: boolean
          print_qr: boolean
          print_unit_column: boolean
          print_vat: boolean
          printer_type: string
          shop_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          font_size?: number
          footer_text?: string | null
          id?: string
          language?: string
          paper_size?: string | null
          print_delivery?: boolean
          print_discount?: boolean
          print_prev_due?: boolean
          print_qr?: boolean
          print_unit_column?: boolean
          print_vat?: boolean
          printer_type?: string
          shop_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          font_size?: number
          footer_text?: string | null
          id?: string
          language?: string
          paper_size?: string | null
          print_delivery?: boolean
          print_discount?: boolean
          print_prev_due?: boolean
          print_qr?: boolean
          print_unit_column?: boolean
          print_vat?: boolean
          printer_type?: string
          shop_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      shop_types: {
        Row: {
          code: string
          created_at: string
          default_categories: string[]
          icon: string | null
          id: string
          is_active: boolean
          name_bn: string
          name_en: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          default_categories?: string[]
          icon?: string | null
          id?: string
          is_active?: boolean
          name_bn: string
          name_en: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          default_categories?: string[]
          icon?: string | null
          id?: string
          is_active?: boolean
          name_bn?: string
          name_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      shop_visits: {
        Row: {
          id: string
          ip_hash: string | null
          shop_id: string
          user_agent: string | null
          visited_at: string
        }
        Insert: {
          id?: string
          ip_hash?: string | null
          shop_id: string
          user_agent?: string | null
          visited_at?: string
        }
        Update: {
          id?: string
          ip_hash?: string | null
          shop_id?: string
          user_agent?: string | null
          visited_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_visits_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          about: string | null
          about_us: string | null
          active_app_theme: string | null
          active_web_theme: string | null
          address: string | null
          banner_url: string | null
          cover_url: string | null
          created_at: string
          currency: string
          deleted_at: string | null
          facebook_page_id: string | null
          facebook_pixel_id: string | null
          facebook_url: string | null
          fb_pixel_id: string | null
          fb_pixel_test_id: string | null
          fb_pixel_token: string | null
          fraud_api_key: string | null
          fraud_api_provider: string | null
          google_analytics_id: string | null
          gtm_id: string | null
          id: string
          is_wholesale: boolean
          logo_url: string | null
          marketplace_enabled: boolean
          meta_description: string | null
          meta_keywords: string | null
          meta_title: string | null
          name: string
          og_image_url: string | null
          owner_id: string
          phone: string | null
          privacy_policy: string | null
          return_policy: string | null
          shipping_policy: string | null
          shop_type_code: string | null
          slug: string | null
          social_links: Json | null
          tagline: string | null
          terms_and_conditions: string | null
          theme_border_radius: number | null
          theme_card_shape: string
          theme_card_variant: string | null
          theme_font_family: string | null
          theme_primary_color: string | null
          theme_secondary_color: string | null
          updated_at: string
          username: string | null
          whatsapp_number: string | null
          wishlist_slug: string | null
        }
        Insert: {
          about?: string | null
          about_us?: string | null
          active_app_theme?: string | null
          active_web_theme?: string | null
          address?: string | null
          banner_url?: string | null
          cover_url?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          facebook_page_id?: string | null
          facebook_pixel_id?: string | null
          facebook_url?: string | null
          fb_pixel_id?: string | null
          fb_pixel_test_id?: string | null
          fb_pixel_token?: string | null
          fraud_api_key?: string | null
          fraud_api_provider?: string | null
          google_analytics_id?: string | null
          gtm_id?: string | null
          id?: string
          is_wholesale?: boolean
          logo_url?: string | null
          marketplace_enabled?: boolean
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          name: string
          og_image_url?: string | null
          owner_id: string
          phone?: string | null
          privacy_policy?: string | null
          return_policy?: string | null
          shipping_policy?: string | null
          shop_type_code?: string | null
          slug?: string | null
          social_links?: Json | null
          tagline?: string | null
          terms_and_conditions?: string | null
          theme_border_radius?: number | null
          theme_card_shape?: string
          theme_card_variant?: string | null
          theme_font_family?: string | null
          theme_primary_color?: string | null
          theme_secondary_color?: string | null
          updated_at?: string
          username?: string | null
          whatsapp_number?: string | null
          wishlist_slug?: string | null
        }
        Update: {
          about?: string | null
          about_us?: string | null
          active_app_theme?: string | null
          active_web_theme?: string | null
          address?: string | null
          banner_url?: string | null
          cover_url?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          facebook_page_id?: string | null
          facebook_pixel_id?: string | null
          facebook_url?: string | null
          fb_pixel_id?: string | null
          fb_pixel_test_id?: string | null
          fb_pixel_token?: string | null
          fraud_api_key?: string | null
          fraud_api_provider?: string | null
          google_analytics_id?: string | null
          gtm_id?: string | null
          id?: string
          is_wholesale?: boolean
          logo_url?: string | null
          marketplace_enabled?: boolean
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          name?: string
          og_image_url?: string | null
          owner_id?: string
          phone?: string | null
          privacy_policy?: string | null
          return_policy?: string | null
          shipping_policy?: string | null
          shop_type_code?: string | null
          slug?: string | null
          social_links?: Json | null
          tagline?: string | null
          terms_and_conditions?: string | null
          theme_border_radius?: number | null
          theme_card_shape?: string
          theme_card_variant?: string | null
          theme_font_family?: string | null
          theme_primary_color?: string | null
          theme_secondary_color?: string | null
          updated_at?: string
          username?: string | null
          whatsapp_number?: string | null
          wishlist_slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shops_shop_type_code_fkey"
            columns: ["shop_type_code"]
            isOneToOne: false
            referencedRelation: "shop_types"
            referencedColumns: ["code"]
          },
        ]
      }
      site_content: {
        Row: {
          created_at: string
          data: Json
          id: string
          is_published: boolean
          section: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          is_published?: boolean
          section: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          is_published?: boolean
          section?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          product_id: string
          qty: number
          ref_id: string | null
          ref_table: string | null
          shop_id: string
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          product_id: string
          qty: number
          ref_id?: string | null
          ref_table?: string | null
          shop_id: string
          type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          product_id?: string
          qty?: number
          ref_id?: string | null
          ref_table?: string | null
          shop_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          code: string
          created_at: string
          description_bn: string | null
          description_en: string | null
          discount_pct: number
          duration_days: number
          id: string
          is_active: boolean
          is_lifetime: boolean
          max_shops: number
          name_bn: string
          name_en: string
          old_price_bdt: number | null
          perks: Json
          price_bdt: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description_bn?: string | null
          description_en?: string | null
          discount_pct?: number
          duration_days: number
          id?: string
          is_active?: boolean
          is_lifetime?: boolean
          max_shops?: number
          name_bn: string
          name_en: string
          old_price_bdt?: number | null
          perks?: Json
          price_bdt: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description_bn?: string | null
          description_en?: string | null
          discount_pct?: number
          duration_days?: number
          id?: string
          is_active?: boolean
          is_lifetime?: boolean
          max_shops?: number
          name_bn?: string
          name_en?: string
          old_price_bdt?: number | null
          perks?: Json
          price_bdt?: number
          updated_at?: string
        }
        Relationships: []
      }
      subscription_requests: {
        Row: {
          admin_note: string | null
          created_at: string
          id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          plan_id: string
          proof_url: string | null
          status: Database["public"]["Enums"]["subscription_request_status"]
          txn_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          plan_id: string
          proof_url?: string | null
          status?: Database["public"]["Enums"]["subscription_request_status"]
          txn_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          plan_id?: string
          proof_url?: string | null
          status?: Database["public"]["Enums"]["subscription_request_status"]
          txn_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_requests_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          plan_id: string
          starts_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          plan_id: string
          starts_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          plan_id?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          created_at: string
          deleted_at: string | null
          due_balance: number
          id: string
          name: string
          phone: string | null
          shop_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          deleted_at?: string | null
          due_balance?: number
          id?: string
          name: string
          phone?: string | null
          shop_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          deleted_at?: string | null
          due_balance?: number
          id?: string
          name?: string
          phone?: string | null
          shop_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      training_videos: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_published: boolean
          sort_order: number
          title_bn: string
          title_en: string
          updated_at: string
          youtube_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          sort_order?: number
          title_bn: string
          title_en?: string
          updated_at?: string
          youtube_id: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          sort_order?: number
          title_bn?: string
          title_en?: string
          updated_at?: string
          youtube_id?: string
        }
        Relationships: []
      }
      usage_limits: {
        Row: {
          feature_key: string
          limit_count: number
          plan_code: string
          updated_at: string
        }
        Insert: {
          feature_key: string
          limit_count?: number
          plan_code: string
          updated_at?: string
        }
        Update: {
          feature_key?: string
          limit_count?: number
          plan_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wishlist_customers: {
        Row: {
          address: string | null
          created_at: string
          id: string
          last_seen_at: string | null
          name: string
          phone: string
          pin_hash: string
          shop_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          last_seen_at?: string | null
          name: string
          phone: string
          pin_hash: string
          shop_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          last_seen_at?: string | null
          name?: string
          phone?: string
          pin_hash?: string
          shop_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      wishlist_templates: {
        Row: {
          created_at: string
          id: string
          items: Json
          name: string
          updated_at: string
          wishlist_customer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          items?: Json
          name: string
          updated_at?: string
          wishlist_customer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          name?: string
          updated_at?: string
          wishlist_customer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_templates_wishlist_customer_id_fkey"
            columns: ["wishlist_customer_id"]
            isOneToOne: false
            referencedRelation: "wishlist_customers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      affiliate_pay_subscription: { Args: { _plan_id: string }; Returns: Json }
      affiliate_recalculate_tier: {
        Args: { _aff_id: string }
        Returns: undefined
      }
      dashboard_summary: {
        Args: { _shop_id: string; _since: string }
        Returns: {
          cash_in: number
          cash_out: number
          expenses: number
          payable: number
          purchases: number
          receivable: number
          sales: number
          stock_value: number
        }[]
      }
      ensure_affiliate_wallet: { Args: { _aff_id: string }; Returns: undefined }
      ensure_default_categories: {
        Args: { _names: string[]; _shop_id: string }
        Returns: undefined
      }
      has_active_subscription: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_consumer: { Args: { _user_id: string }; Returns: boolean }
      is_shop_member: {
        Args: { _shop_id: string; _user_id: string }
        Returns: boolean
      }
      my_account: { Args: never; Returns: Json }
      my_account_resolve: { Args: never; Returns: Json }
      my_shop_perms: { Args: { _shop_id: string }; Returns: Json }
      notify_shop_members: {
        Args: {
          _body: string
          _link: string
          _shop_id: string
          _title: string
          _type: string
        }
        Returns: undefined
      }
      shop_role: {
        Args: { _shop_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      user_active_shop_count: { Args: { _user_id: string }; Returns: number }
      user_shop_limit: { Args: { _user_id: string }; Returns: number }
    }
    Enums: {
      app_role: "admin" | "owner" | "manager" | "cashier" | "buyer" | "consumer"
      payment_method:
        | "cash"
        | "bkash"
        | "nagad"
        | "rocket"
        | "bank"
        | "card"
        | "due"
        | "other"
      sale_status: "completed" | "draft" | "returned" | "cancelled"
      serial_status: "in_stock" | "sold" | "returned" | "damaged"
      subscription_request_status: "pending" | "approved" | "rejected"
      subscription_status: "active" | "expired" | "cancelled"
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
      app_role: ["admin", "owner", "manager", "cashier", "buyer", "consumer"],
      payment_method: [
        "cash",
        "bkash",
        "nagad",
        "rocket",
        "bank",
        "card",
        "due",
        "other",
      ],
      sale_status: ["completed", "draft", "returned", "cancelled"],
      serial_status: ["in_stock", "sold", "returned", "damaged"],
      subscription_request_status: ["pending", "approved", "rejected"],
      subscription_status: ["active", "expired", "cancelled"],
    },
  },
} as const
