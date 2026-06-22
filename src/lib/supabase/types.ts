// AVOID UPDATING THIS FILE DIRECTLY. It is automatically generated.
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
      attribute_options: {
        Row: {
          attribute_id: string
          created_at: string
          id: string
          organization_id: string
          value: string
        }
        Insert: {
          attribute_id: string
          created_at?: string
          id?: string
          organization_id: string
          value: string
        }
        Update: {
          attribute_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "attribute_options_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attribute_options_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      attributes: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
          product_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
          product_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attributes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attributes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attributes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_product_performance"
            referencedColumns: ["product_id"]
          },
        ]
      }
      catalog_histories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          organization_id: string | null
          pdf_url: string | null
          settings: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          organization_id?: string | null
          pdf_url?: string | null
          settings: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          pdf_url?: string | null
          settings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "catalog_histories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      consignment_items: {
        Row: {
          consignment_id: string
          id: string
          quantity: number
          sku_id: string
        }
        Insert: {
          consignment_id: string
          id?: string
          quantity: number
          sku_id: string
        }
        Update: {
          consignment_id?: string
          id?: string
          quantity?: number
          sku_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consignment_items_consignment_id_fkey"
            columns: ["consignment_id"]
            isOneToOne: false
            referencedRelation: "consignment_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consignment_items_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "product_skus"
            referencedColumns: ["id"]
          },
        ]
      }
      consignment_orders: {
        Row: {
          created_at: string
          deadline: string
          id: string
          notes: string | null
          organization_id: string
          seller_id: string
          status: string
        }
        Insert: {
          created_at?: string
          deadline: string
          id?: string
          notes?: string | null
          organization_id: string
          seller_id: string
          status?: string
        }
        Update: {
          created_at?: string
          deadline?: string
          id?: string
          notes?: string | null
          organization_id?: string
          seller_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "consignment_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consignment_orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_notes: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          customer_id: string
          id: string
          is_private: boolean
          organization_id: string
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string
          customer_id: string
          id?: string
          is_private?: boolean
          organization_id: string
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          customer_id?: string
          id?: string
          is_private?: boolean
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_tags: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_tags_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_tags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_unsubscribed: boolean | null
          name: string
          organization_id: string | null
          phone: string | null
          segment: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_unsubscribed?: boolean | null
          name: string
          organization_id?: string | null
          phone?: string | null
          segment?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_unsubscribed?: boolean | null
          name?: string
          organization_id?: string | null
          phone?: string | null
          segment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          order_id: string | null
          organization_id: string
          seller_id: string | null
          type: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          order_id?: string | null
          organization_id: string
          seller_id?: string | null
          type: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          order_id?: string | null
          organization_id?: string
          seller_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      group_buying_campaigns: {
        Row: {
          created_at: string
          deadline: string
          id: string
          name: string
          organization_id: string
          sku_id: string
          status: string
          supplier_id: string
          target_quantity: number
          unit_cost: number
        }
        Insert: {
          created_at?: string
          deadline: string
          id?: string
          name: string
          organization_id: string
          sku_id: string
          status?: string
          supplier_id: string
          target_quantity: number
          unit_cost: number
        }
        Update: {
          created_at?: string
          deadline?: string
          id?: string
          name?: string
          organization_id?: string
          sku_id?: string
          status?: string
          supplier_id?: string
          target_quantity?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "group_buying_campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_buying_campaigns_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "product_skus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_buying_campaigns_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      group_buying_reservations: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          quantity: number
          seller_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          quantity: number
          seller_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          quantity?: number
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_buying_reservations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "group_buying_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_buying_reservations_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      intelligent_alerts: {
        Row: {
          created_at: string | null
          id: string
          is_resolved: boolean | null
          message: string
          organization_id: string | null
          product_id: string | null
          severity: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          message: string
          organization_id?: string | null
          product_id?: string | null
          severity: string
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          message?: string
          organization_id?: string | null
          product_id?: string | null
          severity?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "intelligent_alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intelligent_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intelligent_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_product_performance"
            referencedColumns: ["product_id"]
          },
        ]
      }
      loyalty_configs: {
        Row: {
          created_at: string
          discount_value_per_point: number
          expiration_days: number | null
          id: string
          max_discount_percentage: number
          organization_id: string
          points_per_currency: number
        }
        Insert: {
          created_at?: string
          discount_value_per_point?: number
          expiration_days?: number | null
          id?: string
          max_discount_percentage?: number
          organization_id: string
          points_per_currency?: number
        }
        Update: {
          created_at?: string
          discount_value_per_point?: number
          expiration_days?: number | null
          id?: string
          max_discount_percentage?: number
          organization_id?: string
          points_per_currency?: number
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_configs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_notifications: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          message: string
          organization_id: string
          read: boolean
          type: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          message: string
          organization_id: string
          read?: boolean
          type: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          message?: string
          organization_id?: string
          read?: boolean
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_notifications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_point_movements: {
        Row: {
          amount: number
          created_at: string
          id: string
          order_id: string | null
          type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          order_id?: string | null
          type: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          order_id?: string | null
          type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_point_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_point_movements_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "loyalty_wallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_point_movements_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "vw_expiring_soon_points"
            referencedColumns: ["wallet_id"]
          },
        ]
      }
      loyalty_wallets: {
        Row: {
          balance: number
          created_at: string
          customer_id: string
          id: string
          organization_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          customer_id: string
          id?: string
          organization_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          customer_id?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_wallets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_wallets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_automations: {
        Row: {
          content: string
          created_at: string
          delay_days: number
          id: string
          is_active: boolean
          name: string
          organization_id: string
          subject: string
          trigger_type: string
        }
        Insert: {
          content: string
          created_at?: string
          delay_days?: number
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          subject: string
          trigger_type: string
        }
        Update: {
          content?: string
          created_at?: string
          delay_days?: number
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          subject?: string
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_automations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          content: string
          created_at: string | null
          id: string
          name: string
          organization_id: string
          segment: string | null
          sent_at: string | null
          status: string | null
          subject: string
          target_customer_id: string | null
          total_recipients: number | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          name: string
          organization_id: string
          segment?: string | null
          sent_at?: string | null
          status?: string | null
          subject: string
          target_customer_id?: string | null
          total_recipients?: number | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          name?: string
          organization_id?: string
          segment?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string
          target_customer_id?: string | null
          total_recipients?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_target_customer_id_fkey"
            columns: ["target_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string | null
          price: number
          product_id: string | null
          quantity: number
          sku_id: string | null
        }
        Insert: {
          id?: string
          order_id?: string | null
          price?: number
          product_id?: string | null
          quantity?: number
          sku_id?: string | null
        }
        Update: {
          id?: string
          order_id?: string | null
          price?: number
          product_id?: string | null
          quantity?: number
          sku_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_product_performance"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "order_items_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "product_skus"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          created_at: string
          id: string
          new_status: string
          old_status: string | null
          order_id: string
          organization_id: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          new_status: string
          old_status?: string | null
          order_id: string
          organization_id: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          new_status?: string
          old_status?: string | null
          order_id?: string
          organization_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_id: string | null
          delivery_address: string | null
          delivery_lat: number | null
          delivery_lng: number | null
          id: string
          order_number: string
          organization_id: string | null
          seller_id: string | null
          shipping_fee: number | null
          status: string
          total: number
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          delivery_address?: string | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          id?: string
          order_number: string
          organization_id?: string | null
          seller_id?: string | null
          shipping_fee?: number | null
          status?: string
          total?: number
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          delivery_address?: string | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          id?: string
          order_number?: string
          organization_id?: string | null
          seller_id?: string | null
          shipping_fee?: number | null
          status?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_financial_settings: {
        Row: {
          created_at: string
          expected_monthly_orders: number
          id: string
          monthly_fixed_costs: number
          monthly_pro_labore: number
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expected_monthly_orders?: number
          id?: string
          monthly_fixed_costs?: number
          monthly_pro_labore?: number
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expected_monthly_orders?: number
          id?: string
          monthly_fixed_costs?: number
          monthly_pro_labore?: number
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_financial_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_logistics_settings: {
        Row: {
          base_shipping_fee: number | null
          cost_per_km: number | null
          created_at: string | null
          id: string
          organization_id: string
          store_address: string | null
          store_lat: number | null
          store_lng: number | null
          updated_at: string | null
        }
        Insert: {
          base_shipping_fee?: number | null
          cost_per_km?: number | null
          created_at?: string | null
          id?: string
          organization_id: string
          store_address?: string | null
          store_lat?: number | null
          store_lng?: number | null
          updated_at?: string | null
        }
        Update: {
          base_shipping_fee?: number | null
          cost_per_km?: number | null
          created_at?: string | null
          id?: string
          organization_id?: string
          store_address?: string | null
          store_lat?: number | null
          store_lng?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_logistics_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          banner_url: string | null
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          plan_type: string | null
          slug: string | null
          whatsapp_number: string | null
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          plan_type?: string | null
          slug?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          plan_type?: string | null
          slug?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      pre_orders: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          organization_id: string
          quantity: number
          sku_id: string
          status: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          organization_id: string
          quantity?: number
          sku_id: string
          status?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          organization_id?: string
          quantity?: number
          sku_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "pre_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_orders_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "product_skus"
            referencedColumns: ["id"]
          },
        ]
      }
      product_skus: {
        Row: {
          consigned_stock: number
          created_at: string
          id: string
          image_url: string | null
          min_stock_level: number
          organization_id: string
          price_override: number | null
          product_id: string
          sku_code: string
          stock: number
        }
        Insert: {
          consigned_stock?: number
          created_at?: string
          id?: string
          image_url?: string | null
          min_stock_level?: number
          organization_id: string
          price_override?: number | null
          product_id: string
          sku_code: string
          stock?: number
        }
        Update: {
          consigned_stock?: number
          created_at?: string
          id?: string
          image_url?: string | null
          min_stock_level?: number
          organization_id?: string
          price_override?: number | null
          product_id?: string
          sku_code?: string
          stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_skus_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_skus_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_skus_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_product_performance"
            referencedColumns: ["product_id"]
          },
        ]
      }
      products: {
        Row: {
          cost: number | null
          created_at: string
          id: string
          name: string
          organization_id: string | null
          price: number
          stock: number
        }
        Insert: {
          cost?: number | null
          created_at?: string
          id?: string
          name: string
          organization_id?: string | null
          price?: number
          stock?: number
        }
        Update: {
          cost?: number | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string | null
          price?: number
          stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          full_name: string | null
          id: string
          organization_id: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          full_name?: string | null
          id: string
          organization_id?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          full_name?: string | null
          id?: string
          organization_id?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_items: {
        Row: {
          id: string
          purchase_order_id: string
          quantity: number
          sku_id: string
          unit_cost: number
        }
        Insert: {
          id?: string
          purchase_order_id: string
          quantity: number
          sku_id: string
          unit_cost: number
        }
        Update: {
          id?: string
          purchase_order_id?: string
          quantity?: number
          sku_id?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "product_skus"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          id: string
          invoice_url: string | null
          organization_id: string
          status: string
          supplier_id: string
          total_amount: number
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_url?: string | null
          organization_id: string
          status?: string
          supplier_id: string
          total_amount?: number
        }
        Update: {
          created_at?: string
          id?: string
          invoice_url?: string | null
          organization_id?: string
          status?: string
          supplier_id?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      returns: {
        Row: {
          created_at: string
          id: string
          order_id: string
          organization_id: string
          quantity: number
          reason: string | null
          sku_id: string
          status: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          organization_id: string
          quantity: number
          reason?: string | null
          sku_id: string
          status?: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          organization_id?: string
          quantity?: number
          reason?: string | null
          sku_id?: string
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "product_skus"
            referencedColumns: ["id"]
          },
        ]
      }
      sellers: {
        Row: {
          commission_rate: number | null
          created_at: string
          id: string
          name: string
          organization_id: string
          slug: string
          user_id: string | null
        }
        Insert: {
          commission_rate?: number | null
          created_at?: string
          id?: string
          name: string
          organization_id: string
          slug: string
          user_id?: string | null
        }
        Update: {
          commission_rate?: number | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          slug?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sellers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      site_visits: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string | null
          path: string
          session_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id?: string | null
          path: string
          session_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string | null
          path?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_visits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sku_attribute_values: {
        Row: {
          attribute_option_id: string
          organization_id: string
          sku_id: string
        }
        Insert: {
          attribute_option_id: string
          organization_id: string
          sku_id: string
        }
        Update: {
          attribute_option_id?: string
          organization_id?: string
          sku_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sku_attribute_values_attribute_option_id_fkey"
            columns: ["attribute_option_id"]
            isOneToOne: false
            referencedRelation: "attribute_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sku_attribute_values_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sku_attribute_values_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "product_skus"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          description: string | null
          id: string
          organization_id: string
          quantity: number
          sku_id: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          organization_id: string
          quantity: number
          sku_id: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          organization_id?: string
          quantity?: number
          sku_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "product_skus"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          organization_id: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          organization_id: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          organization_id?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlists: {
        Row: {
          created_at: string | null
          customer_id: string | null
          id: string
          organization_id: string | null
          sku_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          organization_id?: string | null
          sku_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          organization_id?: string | null
          sku_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlists_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlists_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "product_skus"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vw_expiring_soon_points: {
        Row: {
          balance: number | null
          customer_id: string | null
          customer_name: string | null
          expiration_days: number | null
          expiring_points: number | null
          organization_id: string | null
          wallet_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_wallets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_wallets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_product_performance: {
        Row: {
          cost: number | null
          margin_percentage: number | null
          name: string | null
          organization_id: string | null
          price: number | null
          product_id: string | null
          stock: number | null
          total_cogs: number | null
          total_revenue: number | null
          total_sold_quantity: number | null
          unit_profit: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_to_wishlist: {
        Args: {
          p_customer_email: string
          p_customer_name: string
          p_org_id: string
          p_sku_id: string
        }
        Returns: string
      }
      adjust_sku_stock: {
        Args: {
          p_description: string
          p_quantity: number
          p_sku_id: string
          p_type: string
        }
        Returns: undefined
      }
      close_group_buying_campaign: {
        Args: { p_campaign_id: string }
        Returns: undefined
      }
      confirm_order: { Args: { p_order_id: string }; Returns: undefined }
      create_checkout_order: {
        Args: {
          p_customer_email: string
          p_customer_name: string
          p_customer_phone?: string
          p_items?: Json
          p_org_slug: string
          p_seller_slug?: string
        }
        Returns: string
      }
      expire_expired_points: { Args: never; Returns: undefined }
      get_my_org_id: { Args: never; Returns: string }
      get_my_role: { Args: never; Returns: string }
      get_my_seller_id: { Args: never; Returns: string }
      receive_purchase_order: { Args: { p_po_id: string }; Returns: undefined }
      refresh_intelligent_alerts: {
        Args: { p_org_id: string }
        Returns: undefined
      }
      unsubscribe_customer: {
        Args: { p_customer_id: string }
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

