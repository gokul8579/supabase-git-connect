export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          phone: string | null;
          email: string | null;
          website: string | null;
          logo_url: string | null;
          created_at: string;
          updated_at: string;
          billing_type: 'no_gst' | 'inclusive_gst' | 'exclusive_gst';
          gstin: string | null;
          state_code: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          website?: string | null;
          logo_url?: string | null;
          created_at?: string;
          updated_at?: string;
          billing_type?: 'no_gst' | 'inclusive_gst' | 'exclusive_gst';
          gstin?: string | null;
          state_code?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          website?: string | null;
          logo_url?: string | null;
          created_at?: string;
          updated_at?: string;
          billing_type?: 'no_gst' | 'inclusive_gst' | 'exclusive_gst';
          gstin?: string | null;
          state_code?: string | null;
        };
      };
      gst_rates: {
        Row: {
          id: number;
          rate: number;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          rate: number;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          rate?: number;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          price: number;
          sku: string | null;
          barcode: string | null;
          category_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          gst_rate_id: number | null;
          is_taxable: boolean;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          price: number;
          sku?: string | null;
          barcode?: string | null;
          category_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          gst_rate_id?: number | null;
          is_taxable?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          sku?: string | null;
          barcode?: string | null;
          category_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          gst_rate_id?: number | null;
          is_taxable?: boolean;
        };
      };
      invoice_items: {
        Row: {
          id: string;
          invoice_id: string;
          product_id: string | null;
          description: string;
          quantity: number;
          unit_price: number;
          amount: number;
          created_at: string;
          updated_at: string;
          gst_rate_id: number | null;
          cgst_amount: number;
          sgst_amount: number;
          igst_amount: number;
          taxable_value: number;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          product_id?: string | null;
          description: string;
          quantity: number;
          unit_price: number;
          amount: number;
          created_at?: string;
          updated_at?: string;
          gst_rate_id?: number | null;
          cgst_amount?: number;
          sgst_amount?: number;
          igst_amount?: number;
          taxable_value?: number;
        };
        Update: {
          id?: string;
          invoice_id?: string;
          product_id?: string | null;
          description?: string;
          quantity?: number;
          unit_price?: number;
          amount?: number;
          created_at?: string;
          updated_at?: string;
          gst_rate_id?: number | null;
          cgst_amount?: number;
          sgst_amount?: number;
          igst_amount?: number;
          taxable_value?: number;
        };
      };
      // Add other tables as needed
    };
    Views: {
      // Add views if any
    };
    Functions: {
      calculate_gst_components: {
        Args: {
          amount: number;
          gst_rate: number;
          billing_type: string;
        };
        Returns: {
          taxable_value: number;
          cgst_amount: number;
          sgst_amount: number;
          total_tax: number;
          total_amount: number;
        };
      };
    };
    Enums: {
      // Add enums if any
    };
  };
}
