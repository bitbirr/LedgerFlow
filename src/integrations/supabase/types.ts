export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          address: string | null
          category_id: string | null
          created_at: string | null
          credit_limit: number | null
          current_balance: number | null
          email: string | null
          id: string
          name: string
          opening_balance: number | null
          phone: string | null
          status: Database["public"]["Enums"]["account_status"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          category_id?: string | null
          created_at?: string | null
          credit_limit?: number | null
          current_balance?: number | null
          email?: string | null
          id?: string
          name: string
          opening_balance?: number | null
          phone?: string | null
          status?: Database["public"]["Enums"]["account_status"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          category_id?: string | null
          created_at?: string | null
          credit_limit?: number | null
          current_balance?: number | null
          email?: string | null
          id?: string
          name?: string
          opening_balance?: number | null
          phone?: string | null
          status?: Database["public"]["Enums"]["account_status"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      cashbook_entries: {
        Row: {
          amount: number
          attachment_url: string | null
          category: string | null
          created_at: string | null
          description: string
          entry_date: string
          id: string
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          attachment_url?: string | null
          category?: string | null
          created_at?: string | null
          description: string
          entry_date?: string
          id?: string
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          attachment_url?: string | null
          category?: string | null
          created_at?: string | null
          description?: string
          entry_date?: string
          id?: string
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payment_reminders: {
        Row: {
          account_id: string
          created_at: string | null
          id: string
          is_sent: boolean | null
          message: string | null
          reminder_date: string
          sent_at: string | null
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string | null
          id?: string
          is_sent?: boolean | null
          message?: string | null
          reminder_date: string
          sent_at?: string | null
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string | null
          id?: string
          is_sent?: boolean | null
          message?: string | null
          reminder_date?: string
          sent_at?: string | null
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_reminders_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          attachment_url: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          narration: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          reference_number: string | null
          running_balance: number
          transaction_date: string
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          attachment_url?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          narration?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          reference_number?: string | null
          running_balance: number
          transaction_date?: string
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          attachment_url?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          narration?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          reference_number?: string | null
          running_balance?: number
          transaction_date?: string
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      account_status: "active" | "inactive" | "blocked"
      payment_status: "pending" | "partially_paid" | "paid" | "overdue"
      transaction_type: "credit" | "debit"
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
      account_status: ["active", "inactive", "blocked"],
      payment_status: ["pending", "partially_paid", "paid", "overdue"],
      transaction_type: ["credit", "debit"],
    },
  },
} as const
