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
      activities: {
        Row: {
          activity_type: string
          created_at: string
          description: string | null
          duration_minutes: number | null
          end_time: string | null
          id: string
          related_deal_id: string | null
          related_sales_order_id: string | null
          related_to_id: string | null
          related_to_type: string | null
          start_time: string | null
          status: string | null
          subject: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          related_deal_id?: string | null
          related_sales_order_id?: string | null
          related_to_id?: string | null
          related_to_type?: string | null
          start_time?: string | null
          status?: string | null
          subject?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          related_deal_id?: string | null
          related_sales_order_id?: string | null
          related_to_id?: string | null
          related_to_type?: string | null
          start_time?: string | null
          status?: string | null
          subject?: string | null
          user_id?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string
          date: string
          department_id: string | null
          employee_id: string
          id: string
          notes: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date: string
          department_id?: string | null
          employee_id: string
          id?: string
          notes?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date?: string
          department_id?: string | null
          employee_id?: string
          id?: string
          notes?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_hr_employee_performance"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      calls: {
        Row: {
          call_type: Database["public"]["Enums"]["call_type"] | null
          created_at: string
          duration: number | null
          id: string
          notes: string | null
          outcome: string | null
          related_to_id: string | null
          related_to_type: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["call_status"] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          call_type?: Database["public"]["Enums"]["call_type"] | null
          created_at?: string
          duration?: number | null
          id?: string
          notes?: string | null
          outcome?: string | null
          related_to_id?: string | null
          related_to_type?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["call_status"] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          call_type?: Database["public"]["Enums"]["call_type"] | null
          created_at?: string
          duration?: number | null
          id?: string
          notes?: string | null
          outcome?: string | null
          related_to_id?: string | null
          related_to_type?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["call_status"] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          address: string | null
          billing_type: string | null
          brand_color: string | null
          cin_number: string | null
          city: string | null
          company_name: string
          company_type: string | null
          country: string | null
          created_at: string
          email: string | null
          form_embed_token: string | null
          gst_number: string | null
          id: string
          logo_url: string | null
          onboarding_completed: boolean | null
          onboarding_completed_at: string | null
          phone: string | null
          postal_code: string | null
          quotation_template: string | null
          show_cin_number: boolean | null
          show_gst_number: boolean | null
          show_gst_split: boolean | null
          show_tax_id: boolean | null
          state: string | null
          tax_id: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          billing_type?: string | null
          brand_color?: string | null
          cin_number?: string | null
          city?: string | null
          company_name: string
          company_type?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          form_embed_token?: string | null
          gst_number?: string | null
          id?: string
          logo_url?: string | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          phone?: string | null
          postal_code?: string | null
          quotation_template?: string | null
          show_cin_number?: boolean | null
          show_gst_number?: boolean | null
          show_gst_split?: boolean | null
          show_tax_id?: boolean | null
          state?: string | null
          tax_id?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          billing_type?: string | null
          brand_color?: string | null
          cin_number?: string | null
          city?: string | null
          company_name?: string
          company_type?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          form_embed_token?: string | null
          gst_number?: string | null
          id?: string
          logo_url?: string | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          phone?: string | null
          postal_code?: string | null
          quotation_template?: string | null
          show_cin_number?: boolean | null
          show_gst_number?: boolean | null
          show_gst_split?: boolean | null
          show_tax_id?: boolean | null
          state?: string | null
          tax_id?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      contracts: {
        Row: {
          contract_number: string
          contract_type: Database["public"]["Enums"]["contract_type"]
          created_at: string | null
          customer_id: string | null
          description: string
          end_date: string | null
          id: string
          renewal_date: string | null
          start_date: string
          status: Database["public"]["Enums"]["contract_status"]
          title: string
          updated_at: string | null
          user_id: string
          value: number
        }
        Insert: {
          contract_number?: string
          contract_type?: Database["public"]["Enums"]["contract_type"]
          created_at?: string | null
          customer_id?: string | null
          description: string
          end_date?: string | null
          id?: string
          renewal_date?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["contract_status"]
          title: string
          updated_at?: string | null
          user_id: string
          value?: number
        }
        Update: {
          contract_number?: string
          contract_type?: Database["public"]["Enums"]["contract_type"]
          created_at?: string | null
          customer_id?: string | null
          description?: string
          end_date?: string | null
          id?: string
          renewal_date?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["contract_status"]
          title?: string
          updated_at?: string | null
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "contracts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "view_top_customers"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          cin_number: string | null
          city: string | null
          company: string | null
          country: string | null
          created_at: string
          email: string | null
          gst_number: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          postal_code: string | null
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          cin_number?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          gst_number?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          cin_number?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          gst_number?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_logs: {
        Row: {
          bank_balance: number | null
          cash_in_hand: number | null
          closing_stock: number | null
          created_at: string
          expense_amount: number | null
          id: string
          income_amount: number | null
          log_date: string | null
          notes: string | null
          number_of_purchases: number | null
          number_of_sales: number | null
          opening_stock: number | null
          sales_amount: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_balance?: number | null
          cash_in_hand?: number | null
          closing_stock?: number | null
          created_at?: string
          expense_amount?: number | null
          id?: string
          income_amount?: number | null
          log_date?: string | null
          notes?: string | null
          number_of_purchases?: number | null
          number_of_sales?: number | null
          opening_stock?: number | null
          sales_amount?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_balance?: number | null
          cash_in_hand?: number | null
          closing_stock?: number | null
          created_at?: string
          expense_amount?: number | null
          id?: string
          income_amount?: number | null
          log_date?: string | null
          notes?: string | null
          number_of_purchases?: number | null
          number_of_sales?: number | null
          opening_stock?: number | null
          sales_amount?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deal_items: {
        Row: {
          cgst_percent: number | null
          cost_price: number | null
          created_at: string | null
          deal_id: string | null
          description: string | null
          id: string
          product_id: string | null
          quantity: number
          sgst_percent: number | null
          taxable_value: number | null
          total_amount: number | null
          total_tax: number | null
          unit_price: number
          user_id: string | null
        }
        Insert: {
          cgst_percent?: number | null
          cost_price?: number | null
          created_at?: string | null
          deal_id?: string | null
          description?: string | null
          id?: string
          product_id?: string | null
          quantity?: number
          sgst_percent?: number | null
          taxable_value?: number | null
          total_amount?: number | null
          total_tax?: number | null
          unit_price: number
          user_id?: string | null
        }
        Update: {
          cgst_percent?: number | null
          cost_price?: number | null
          created_at?: string | null
          deal_id?: string | null
          description?: string | null
          id?: string
          product_id?: string | null
          quantity?: number
          sgst_percent?: number | null
          taxable_value?: number | null
          total_amount?: number | null
          total_tax?: number | null
          unit_price?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_items_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_products_stock_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "deal_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_sales_items_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "deal_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_stock_movement"
            referencedColumns: ["product_id"]
          },
        ]
      }
      deals: {
        Row: {
          assigned_to: string | null
          created_at: string
          customer_id: string | null
          discount_amount: number | null
          expected_close_date: string | null
          expected_profit: number | null
          id: string
          lead_id: string | null
          notes: string | null
          probability: number | null
          stage: Database["public"]["Enums"]["deal_stage"] | null
          title: string
          updated_at: string
          user_id: string
          value: number | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          customer_id?: string | null
          discount_amount?: number | null
          expected_close_date?: string | null
          expected_profit?: number | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          probability?: number | null
          stage?: Database["public"]["Enums"]["deal_stage"] | null
          title: string
          updated_at?: string
          user_id: string
          value?: number | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          customer_id?: string | null
          discount_amount?: number | null
          expected_close_date?: string | null
          expected_profit?: number | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          probability?: number | null
          stage?: Database["public"]["Enums"]["deal_stage"] | null
          title?: string
          updated_at?: string
          user_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "view_top_customers"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      department_members: {
        Row: {
          created_at: string
          department_id: string
          employee_id: string
          id: string
          role: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          department_id: string
          employee_id: string
          id?: string
          role?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          department_id?: string
          employee_id?: string
          id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_members_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_members_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_members_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_hr_employee_performance"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          head_of_department: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          head_of_department?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          head_of_department?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_head_of_department"
            columns: ["head_of_department"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_head_of_department"
            columns: ["head_of_department"]
            isOneToOne: false
            referencedRelation: "view_hr_employee_performance"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      employees: {
        Row: {
          address: string | null
          created_at: string
          department_id: string | null
          email: string | null
          emergency_contact: string | null
          employee_code: string | null
          first_name: string
          hire_date: string | null
          id: string
          last_name: string
          phone: string | null
          position: string | null
          salary: number | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          department_id?: string | null
          email?: string | null
          emergency_contact?: string | null
          employee_code?: string | null
          first_name: string
          hire_date?: string | null
          id?: string
          last_name: string
          phone?: string | null
          position?: string | null
          salary?: number | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          department_id?: string | null
          email?: string | null
          emergency_contact?: string | null
          employee_code?: string | null
          first_name?: string
          hire_date?: string | null
          id?: string
          last_name?: string
          phone?: string | null
          position?: string | null
          salary?: number | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          company: string | null
          created_at: string
          email: string | null
          id: string
          interest_level: number | null
          name: string
          notes: string | null
          phone: string | null
          source: Database["public"]["Enums"]["lead_source"] | null
          status: Database["public"]["Enums"]["lead_status"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          interest_level?: number | null
          name: string
          notes?: string | null
          phone?: string | null
          source?: Database["public"]["Enums"]["lead_source"] | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          interest_level?: number | null
          name?: string
          notes?: string | null
          phone?: string | null
          source?: Database["public"]["Enums"]["lead_source"] | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          days: number
          employee_id: string
          end_date: string
          id: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          reason: string | null
          start_date: string
          status: Database["public"]["Enums"]["leave_status"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          days: number
          employee_id: string
          end_date: string
          id?: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          reason?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["leave_status"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          days?: number
          employee_id?: string
          end_date?: string
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          reason?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["leave_status"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_hr_employee_performance"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      papers: {
        Row: {
          created_at: string
          file_path: string
          file_type: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_path: string
          file_type: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_path?: string
          file_type?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payroll: {
        Row: {
          allowances: number | null
          basic_salary: number
          created_at: string
          deductions: number | null
          employee_id: string
          from_date: string | null
          id: string
          month: number
          net_salary: number
          notes: string | null
          payment_date: string | null
          status: string | null
          to_date: string | null
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          allowances?: number | null
          basic_salary: number
          created_at?: string
          deductions?: number | null
          employee_id: string
          from_date?: string | null
          id?: string
          month: number
          net_salary: number
          notes?: string | null
          payment_date?: string | null
          status?: string | null
          to_date?: string | null
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          allowances?: number | null
          basic_salary?: number
          created_at?: string
          deductions?: number | null
          employee_id?: string
          from_date?: string | null
          id?: string
          month?: number
          net_salary?: number
          notes?: string | null
          payment_date?: string | null
          status?: string | null
          to_date?: string | null
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "view_hr_employee_performance"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      payroll_holidays: {
        Row: {
          created_at: string | null
          date: string
          id: string
          title: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          title?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          title?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payroll_month_holidays: {
        Row: {
          created_at: string | null
          date: string
          id: string
          month: number
          type: string | null
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          month: number
          type?: string | null
          user_id: string
          year: number
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          month?: number
          type?: string | null
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      payroll_month_settings: {
        Row: {
          created_at: string | null
          id: string
          month: number
          saturday_is_working: boolean | null
          saturday_pattern: string | null
          special_holidays: number | null
          sundays: number | null
          total_days: number | null
          updated_at: string | null
          user_id: string
          working_days: number | null
          year: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          month: number
          saturday_is_working?: boolean | null
          saturday_pattern?: string | null
          special_holidays?: number | null
          sundays?: number | null
          total_days?: number | null
          updated_at?: string | null
          user_id: string
          working_days?: number | null
          year: number
        }
        Update: {
          created_at?: string | null
          id?: string
          month?: number
          saturday_is_working?: boolean | null
          saturday_pattern?: string | null
          special_holidays?: number | null
          sundays?: number | null
          total_days?: number | null
          updated_at?: string | null
          user_id?: string
          working_days?: number | null
          year?: number
        }
        Relationships: []
      }
      payroll_working_days: {
        Row: {
          created_at: string | null
          holidays: number | null
          id: string
          month: number
          notes: string | null
          special_holidays: number | null
          user_id: string | null
          working_days: number
          year: number
        }
        Insert: {
          created_at?: string | null
          holidays?: number | null
          id?: string
          month: number
          notes?: string | null
          special_holidays?: number | null
          user_id?: string | null
          working_days: number
          year: number
        }
        Update: {
          created_at?: string | null
          holidays?: number | null
          id?: string
          month?: number
          notes?: string | null
          special_holidays?: number | null
          user_id?: string | null
          working_days?: number
          year?: number
        }
        Relationships: []
      }
      price_book_items: {
        Row: {
          created_at: string
          id: string
          list_price: number
          price_book_id: string
          product_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          list_price: number
          price_book_id: string
          product_id: string
        }
        Update: {
          created_at?: string
          id?: string
          list_price?: number
          price_book_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_book_items_price_book_id_fkey"
            columns: ["price_book_id"]
            isOneToOne: false
            referencedRelation: "price_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_book_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_book_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_products_stock_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "price_book_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_sales_items_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "price_book_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_stock_movement"
            referencedColumns: ["product_id"]
          },
        ]
      }
      price_books: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_catalogues: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          cost_price: number | null
          created_at: string
          description: string | null
          gst_rate: number | null
          id: string
          name: string
          price_book_id: string | null
          product_type: Database["public"]["Enums"]["product_type"] | null
          quantity_in_stock: number | null
          reorder_level: number | null
          sku: string | null
          unit_price: number
          updated_at: string
          user_id: string
          vendor_id: string | null
          weight: number | null
          weight_unit: string | null
        }
        Insert: {
          cost_price?: number | null
          created_at?: string
          description?: string | null
          gst_rate?: number | null
          id?: string
          name: string
          price_book_id?: string | null
          product_type?: Database["public"]["Enums"]["product_type"] | null
          quantity_in_stock?: number | null
          reorder_level?: number | null
          sku?: string | null
          unit_price: number
          updated_at?: string
          user_id: string
          vendor_id?: string | null
          weight?: number | null
          weight_unit?: string | null
        }
        Update: {
          cost_price?: number | null
          created_at?: string
          description?: string | null
          gst_rate?: number | null
          id?: string
          name?: string
          price_book_id?: string | null
          product_type?: Database["public"]["Enums"]["product_type"] | null
          quantity_in_stock?: number | null
          reorder_level?: number | null
          sku?: string | null
          unit_price?: number
          updated_at?: string
          user_id?: string
          vendor_id?: string | null
          weight?: number | null
          weight_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "view_vendor_performance"
            referencedColumns: ["vendor_id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          product_id: string | null
          purchase_order_id: string
          quantity: number
          tax_amount: number | null
          unit_price: number
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          product_id?: string | null
          purchase_order_id: string
          quantity?: number
          tax_amount?: number | null
          unit_price: number
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          product_id?: string | null
          purchase_order_id?: string
          quantity?: number
          tax_amount?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_products_stock_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_sales_items_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_stock_movement"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          discount_amount: number | null
          expected_delivery_date: string | null
          id: string
          notes: string | null
          order_date: string | null
          payment_status: string
          po_number: string
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string
          user_id: string
          vendor_id: string | null
        }
        Insert: {
          created_at?: string
          discount_amount?: number | null
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string | null
          payment_status?: string
          po_number: string
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string
          user_id: string
          vendor_id?: string | null
        }
        Update: {
          created_at?: string
          discount_amount?: number | null
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string | null
          payment_status?: string
          po_number?: string
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string
          user_id?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "view_vendor_performance"
            referencedColumns: ["vendor_id"]
          },
        ]
      }
      quotation_items: {
        Row: {
          amount: number
          cgst_amount: number | null
          cgst_percent: number | null
          created_at: string
          description: string
          id: string
          product_id: string | null
          quantity: number
          quotation_id: string
          sgst_amount: number | null
          sgst_percent: number | null
          taxable_value: number | null
          unit_price: number
        }
        Insert: {
          amount: number
          cgst_amount?: number | null
          cgst_percent?: number | null
          created_at?: string
          description: string
          id?: string
          product_id?: string | null
          quantity?: number
          quotation_id: string
          sgst_amount?: number | null
          sgst_percent?: number | null
          taxable_value?: number | null
          unit_price: number
        }
        Update: {
          amount?: number
          cgst_amount?: number | null
          cgst_percent?: number | null
          created_at?: string
          description?: string
          id?: string
          product_id?: string | null
          quantity?: number
          quotation_id?: string
          sgst_amount?: number | null
          sgst_percent?: number | null
          taxable_value?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_products_stock_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "quotation_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_sales_items_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "quotation_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_stock_movement"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          billing_type: string | null
          cgst_percent: number | null
          created_at: string
          customer_cin_number: string | null
          customer_gst_number: string | null
          customer_id: string | null
          deal_id: string | null
          discount_amount: number | null
          id: string
          notes: string | null
          quotation_number: string
          sgst_percent: number | null
          show_gst_split: boolean | null
          status: Database["public"]["Enums"]["quotation_status"] | null
          subtotal: number | null
          tax_amount: number | null
          total_amount: number
          updated_at: string
          user_id: string
          valid_until: string | null
        }
        Insert: {
          billing_type?: string | null
          cgst_percent?: number | null
          created_at?: string
          customer_cin_number?: string | null
          customer_gst_number?: string | null
          customer_id?: string | null
          deal_id?: string | null
          discount_amount?: number | null
          id?: string
          notes?: string | null
          quotation_number: string
          sgst_percent?: number | null
          show_gst_split?: boolean | null
          status?: Database["public"]["Enums"]["quotation_status"] | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string
          user_id: string
          valid_until?: string | null
        }
        Update: {
          billing_type?: string | null
          cgst_percent?: number | null
          created_at?: string
          customer_cin_number?: string | null
          customer_gst_number?: string | null
          customer_id?: string | null
          deal_id?: string | null
          discount_amount?: number | null
          id?: string
          notes?: string | null
          quotation_number?: string
          sgst_percent?: number | null
          show_gst_split?: boolean | null
          status?: Database["public"]["Enums"]["quotation_status"] | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string
          user_id?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "view_top_customers"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "quotations_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_order_items: {
        Row: {
          amount: number
          cgst_amount: number | null
          cgst_percent: number | null
          created_at: string
          description: string
          id: string
          product_gst_percent: number | null
          product_id: string | null
          quantity: number
          sales_order_id: string
          sgst_amount: number | null
          sgst_percent: number | null
          taxable_value: number | null
          unit_price: number
        }
        Insert: {
          amount: number
          cgst_amount?: number | null
          cgst_percent?: number | null
          created_at?: string
          description: string
          id?: string
          product_gst_percent?: number | null
          product_id?: string | null
          quantity?: number
          sales_order_id: string
          sgst_amount?: number | null
          sgst_percent?: number | null
          taxable_value?: number | null
          unit_price: number
        }
        Update: {
          amount?: number
          cgst_amount?: number | null
          cgst_percent?: number | null
          created_at?: string
          description?: string
          id?: string
          product_gst_percent?: number | null
          product_id?: string | null
          quantity?: number
          sales_order_id?: string
          sgst_amount?: number | null
          sgst_percent?: number | null
          taxable_value?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_products_stock_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "sales_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_sales_items_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "sales_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_stock_movement"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "sales_order_items_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          billing_type: string | null
          cgst_percent: number | null
          created_at: string
          customer_cin_number: string | null
          customer_gst_number: string | null
          customer_id: string | null
          deal_id: string | null
          discount_amount: number | null
          expected_delivery_date: string | null
          id: string
          notes: string | null
          order_date: string | null
          order_number: string
          party_id: string | null
          party_type: string | null
          payment_status: string | null
          quotation_id: string | null
          sgst_percent: number | null
          show_gst_split: boolean | null
          status: Database["public"]["Enums"]["order_status"] | null
          subtotal: number | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_type?: string | null
          cgst_percent?: number | null
          created_at?: string
          customer_cin_number?: string | null
          customer_gst_number?: string | null
          customer_id?: string | null
          deal_id?: string | null
          discount_amount?: number | null
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string | null
          order_number: string
          party_id?: string | null
          party_type?: string | null
          payment_status?: string | null
          quotation_id?: string | null
          sgst_percent?: number | null
          show_gst_split?: boolean | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_type?: string | null
          cgst_percent?: number | null
          created_at?: string
          customer_cin_number?: string | null
          customer_gst_number?: string | null
          customer_id?: string | null
          deal_id?: string | null
          discount_amount?: number | null
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string | null
          order_number?: string
          party_id?: string | null
          party_type?: string | null
          payment_status?: string | null
          quotation_id?: string | null
          sgst_percent?: number | null
          show_gst_split?: boolean | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "view_top_customers"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "sales_orders_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_accounts: {
        Row: {
          admin_user_id: string
          allowed_modules: string[]
          created_at: string
          id: string
          is_active: boolean
          staff_email: string
          staff_name: string
          staff_user_id: string
          updated_at: string
        }
        Insert: {
          admin_user_id: string
          allowed_modules?: string[]
          created_at?: string
          id?: string
          is_active?: boolean
          staff_email: string
          staff_name: string
          staff_user_id: string
          updated_at?: string
        }
        Update: {
          admin_user_id?: string
          allowed_modules?: string[]
          created_at?: string
          id?: string
          is_active?: boolean
          staff_email?: string
          staff_name?: string
          staff_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      sticky_notes: {
        Row: {
          color: string
          content: string
          created_at: string | null
          id: string
          is_pinned: boolean
          position_x: number | null
          position_y: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string
          content: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean
          position_x?: number | null
          position_y?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string
          content?: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean
          position_x?: number | null
          position_y?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      stock_approval: {
        Row: {
          approval_type: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          notes: string | null
          product_id: string | null
          purchase_order_id: string | null
          quantity: number
          sales_order_id: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_type?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string | null
          purchase_order_id?: string | null
          quantity: number
          sales_order_id?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_type?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string | null
          purchase_order_id?: string | null
          quantity?: number
          sales_order_id?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_approval_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_approval_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_products_stock_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "stock_approval_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_sales_items_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "stock_approval_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_stock_movement"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "stock_approval_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_approval_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"] | null
          related_to_id: string | null
          related_to_type: string | null
          status: Database["public"]["Enums"]["task_status"] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"] | null
          related_to_id?: string | null
          related_to_type?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"] | null
          related_to_id?: string | null
          related_to_type?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "view_hr_employee_performance"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      ticket_attachments: {
        Row: {
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          ticket_id: string
          uploaded_at: string | null
        }
        Insert: {
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          ticket_id: string
          uploaded_at?: string | null
        }
        Update: {
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          ticket_id?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_history: {
        Row: {
          action_type: string
          created_at: string | null
          id: string
          new_value: string | null
          notes: string | null
          old_value: string | null
          ticket_id: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          id?: string
          new_value?: string | null
          notes?: string | null
          old_value?: string | null
          ticket_id: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          id?: string
          new_value?: string | null
          notes?: string | null
          old_value?: string | null
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_history_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_notes: {
        Row: {
          created_at: string | null
          id: string
          is_internal: boolean
          note: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_internal?: boolean
          note: string
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_internal?: boolean
          note?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_notes_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_replies: {
        Row: {
          created_at: string | null
          customer_email: string | null
          id: string
          reply_text: string
          sent_at: string | null
          sent_to_customer: boolean
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          customer_email?: string | null
          id?: string
          reply_text: string
          sent_at?: string | null
          sent_to_customer?: boolean
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          customer_email?: string | null
          id?: string
          reply_text?: string
          sent_at?: string | null
          sent_to_customer?: boolean
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_replies_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          created_at: string | null
          customer_id: string | null
          deadline: string | null
          description: string
          id: string
          issue_type: Database["public"]["Enums"]["ticket_issue_type"]
          party_id: string | null
          party_type: string | null
          priority: Database["public"]["Enums"]["ticket_priority"]
          resolved_at: string | null
          sales_order_id: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          ticket_number: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          deadline?: string | null
          description: string
          id?: string
          issue_type?: Database["public"]["Enums"]["ticket_issue_type"]
          party_id?: string | null
          party_type?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          sales_order_id?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          ticket_number: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          deadline?: string | null
          description?: string
          id?: string
          issue_type?: Database["public"]["Enums"]["ticket_issue_type"]
          party_id?: string | null
          party_type?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          sales_order_id?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          ticket_number?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "view_top_customers"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "tickets_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"] | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string | null
          duration_seconds: number | null
          id: string
          session_date: string
          total_seconds: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          session_date: string
          total_seconds?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          session_date?: string
          total_seconds?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vendors: {
        Row: {
          address: string | null
          city: string | null
          company: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          postal_code: string | null
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      warehouses: {
        Row: {
          capacity: number | null
          created_at: string
          current_stock: number | null
          id: string
          location: string | null
          manager: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          current_stock?: number | null
          id?: string
          location?: string | null
          manager?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          current_stock?: number | null
          id?: string
          location?: string | null
          manager?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_manager_fkey"
            columns: ["manager"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouses_manager_fkey"
            columns: ["manager"]
            isOneToOne: false
            referencedRelation: "view_hr_employee_performance"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      website_forms_raw: {
        Row: {
          created_at: string | null
          data: Json
          form_name: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data: Json
          form_name?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json
          form_name?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      report_gst_summary: {
        Row: {
          invoices_count: number | null
          month_start: string | null
          total_cgst: number | null
          total_gst: number | null
          total_sgst: number | null
          user_id: string | null
        }
        Relationships: []
      }
      report_pnl: {
        Row: {
          month_start: string | null
          net_profit: number | null
          total_expenses: number | null
          total_income: number | null
          total_sales: number | null
          user_id: string | null
        }
        Relationships: []
      }
      report_sales_by_product: {
        Row: {
          first_sale: string | null
          last_sale: string | null
          product_id: string | null
          product_name: string | null
          sku: string | null
          total_amount: number | null
          total_cgst: number | null
          total_cost: number | null
          total_margin: number | null
          total_quantity: number | null
          total_sgst: number | null
          total_taxable_value: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_products_stock_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "sales_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_sales_items_report"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "sales_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "view_stock_movement"
            referencedColumns: ["product_id"]
          },
        ]
      }
      view_activity_summary: {
        Row: {
          call_activities: number | null
          meeting_activities: number | null
          task_activities: number | null
          total_activities: number | null
          user_id: string | null
        }
        Relationships: []
      }
      view_attendance_summary: {
        Row: {
          absent_days: number | null
          late_entries: number | null
          leave_days: number | null
          present_days: number | null
          total_records: number | null
          user_id: string | null
        }
        Relationships: []
      }
      view_calls_summary: {
        Row: {
          avg_call_duration: number | null
          cancelled_calls: number | null
          completed_calls: number | null
          inbound_calls: number | null
          missed_calls: number | null
          outbound_calls: number | null
          total_calls: number | null
          user_id: string | null
        }
        Relationships: []
      }
      view_deals_summary: {
        Row: {
          active_deals: number | null
          deals_by_stage: Json | null
          lost_deals: number | null
          total_deals: number | null
          total_profit: number | null
          total_revenue: number | null
          user_id: string | null
          won_deals: number | null
        }
        Relationships: []
      }
      view_full_business_dashboard: {
        Row: {
          completed_tasks: number | null
          converted_leads: number | null
          lost_deals: number | null
          pending_tasks: number | null
          total_deals: number | null
          total_employees: number | null
          total_leads: number | null
          total_purchase_amount: number | null
          total_sales_amount: number | null
          total_stock_value: number | null
          user_id: string | null
          won_deals: number | null
        }
        Relationships: []
      }
      view_hr_employee_performance: {
        Row: {
          attendance_records: number | null
          days_absent: number | null
          days_present: number | null
          employee_id: string | null
          employee_name: string | null
          tasks_completed: number | null
          tasks_pending: number | null
          total_salary_paid: number | null
          user_id: string | null
        }
        Relationships: []
      }
      view_leads_summary: {
        Row: {
          converted_leads: number | null
          leads_by_source: Json | null
          leads_by_status: Json | null
          lost_leads: number | null
          qualified_leads: number | null
          total_leads: number | null
          user_id: string | null
        }
        Relationships: []
      }
      view_leave_summary: {
        Row: {
          approved_leaves: number | null
          pending_leaves: number | null
          rejected_leaves: number | null
          total_leave_days: number | null
          total_leave_requests: number | null
          user_id: string | null
        }
        Relationships: []
      }
      view_payroll_summary: {
        Row: {
          total_allowances: number | null
          total_deductions: number | null
          total_payrolls: number | null
          total_salary_paid: number | null
          user_id: string | null
        }
        Relationships: []
      }
      view_products_stock_report: {
        Row: {
          cost_price: number | null
          name: string | null
          product_id: string | null
          quantity_in_stock: number | null
          reorder_level: number | null
          sku: string | null
          total_stock_value: number | null
          unit_price: number | null
          user_id: string | null
        }
        Insert: {
          cost_price?: number | null
          name?: string | null
          product_id?: string | null
          quantity_in_stock?: number | null
          reorder_level?: number | null
          sku?: string | null
          total_stock_value?: never
          unit_price?: number | null
          user_id?: string | null
        }
        Update: {
          cost_price?: number | null
          name?: string | null
          product_id?: string | null
          quantity_in_stock?: number | null
          reorder_level?: number | null
          sku?: string | null
          total_stock_value?: never
          unit_price?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      view_purchase_orders_summary: {
        Row: {
          cancelled_po: number | null
          completed_po: number | null
          total_po_subtotal: number | null
          total_po_tax: number | null
          total_po_value: number | null
          total_purchase_orders: number | null
          user_id: string | null
        }
        Relationships: []
      }
      view_sales_items_report: {
        Row: {
          product_id: string | null
          product_name: string | null
          total_profit: number | null
          total_quantity_sold: number | null
          total_sales_value: number | null
          user_id: string | null
        }
        Relationships: []
      }
      view_sales_orders_summary: {
        Row: {
          delivered_orders: number | null
          paid_orders: number | null
          pending_orders: number | null
          total_orders: number | null
          total_sales: number | null
          unpaid_orders: number | null
          user_id: string | null
        }
        Relationships: []
      }
      view_sales_vs_purchase: {
        Row: {
          net_balance: number | null
          total_purchases: number | null
          total_sales: number | null
          user_id: string | null
        }
        Relationships: []
      }
      view_stock_movement: {
        Row: {
          product_id: string | null
          product_name: string | null
          total_stock_in: number | null
          total_stock_out: number | null
          user_id: string | null
        }
        Insert: {
          product_id?: string | null
          product_name?: string | null
          total_stock_in?: never
          total_stock_out?: never
          user_id?: string | null
        }
        Update: {
          product_id?: string | null
          product_name?: string | null
          total_stock_in?: never
          total_stock_out?: never
          user_id?: string | null
        }
        Relationships: []
      }
      view_top_customers: {
        Row: {
          company: string | null
          customer_id: string | null
          name: string | null
          order_count: number | null
          total_spent: number | null
          user_id: string | null
        }
        Relationships: []
      }
      view_vendor_performance: {
        Row: {
          company: string | null
          name: string | null
          purchase_orders_count: number | null
          total_purchase_value: number | null
          user_id: string | null
          vendor_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      decrement_stock: {
        Args: { product_id: string; qty_to_reduce: number }
        Returns: undefined
      }
      get_admin_user_id: { Args: { _user_id: string }; Returns: string }
      get_dashboard_revenue: {
        Args: { p_user_id: string }
        Returns: {
          deal_revenue: number
          service_charges: number
          so_revenue: number
          tax_collected: number
        }[]
      }
      has_module_access: {
        Args: { _module: string; _user_id: string }
        Returns: boolean
      }
      is_admin_user: { Args: { _user_id: string }; Returns: boolean }
      upsert_user_session: {
        Args: { p_date: string; p_seconds: number; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      call_status: "scheduled" | "completed" | "missed" | "cancelled"
      call_type: "inbound" | "outbound" | "call" | "meeting"
      contract_status: "active" | "expired" | "pending" | "cancelled"
      contract_type: "service" | "maintenance" | "support" | "license" | "other"
      deal_stage:
        | "enquiry"
        | "proposal"
        | "negotiation"
        | "closed_won"
        | "closed_lost"
      lead_source:
        | "call"
        | "walk_in"
        | "website"
        | "referral"
        | "campaign"
        | "other"
      lead_status: "new" | "contacted" | "qualified" | "lost" | "converted"
      leave_status: "pending" | "approved" | "rejected" | "cancelled"
      leave_type: "sick" | "casual" | "vacation" | "unpaid" | "other"
      order_status:
        | "draft"
        | "confirmed"
        | "shipped"
        | "delivered"
        | "cancelled"
      product_type: "goods" | "service"
      quotation_status: "draft" | "sent" | "accepted" | "rejected"
      task_priority: "low" | "medium" | "high"
      task_status: "pending" | "in_progress" | "completed" | "cancelled"
      ticket_issue_type: "technical" | "billing" | "sales" | "support" | "other"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status:
        | "open"
        | "in_progress"
        | "waiting_for_customer"
        | "resolved"
        | "closed"
      user_role: "admin" | "manager" | "sales_rep"
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
      call_status: ["scheduled", "completed", "missed", "cancelled"],
      call_type: ["inbound", "outbound", "call", "meeting"],
      contract_status: ["active", "expired", "pending", "cancelled"],
      contract_type: ["service", "maintenance", "support", "license", "other"],
      deal_stage: [
        "enquiry",
        "proposal",
        "negotiation",
        "closed_won",
        "closed_lost",
      ],
      lead_source: [
        "call",
        "walk_in",
        "website",
        "referral",
        "campaign",
        "other",
      ],
      lead_status: ["new", "contacted", "qualified", "lost", "converted"],
      leave_status: ["pending", "approved", "rejected", "cancelled"],
      leave_type: ["sick", "casual", "vacation", "unpaid", "other"],
      order_status: ["draft", "confirmed", "shipped", "delivered", "cancelled"],
      product_type: ["goods", "service"],
      quotation_status: ["draft", "sent", "accepted", "rejected"],
      task_priority: ["low", "medium", "high"],
      task_status: ["pending", "in_progress", "completed", "cancelled"],
      ticket_issue_type: ["technical", "billing", "sales", "support", "other"],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: [
        "open",
        "in_progress",
        "waiting_for_customer",
        "resolved",
        "closed",
      ],
      user_role: ["admin", "manager", "sales_rep"],
    },
  },
} as const
