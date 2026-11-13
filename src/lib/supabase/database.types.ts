
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "household_invites": {
                  Row: {
                    "accepted_at": string | null,"accepted_by": string | null,"created_at": string,"email": string,"expires_at": string,"household_id": string,"id": string,"invited_by": string | null,"token": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"created_at"?: string,"email": string,"expires_at"?: string,"household_id": string,"id"?: string,"invited_by"?: string | null,"token"?: string
                  }
                  Update: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"created_at"?: string,"email"?: string,"expires_at"?: string,"household_id"?: string,"id"?: string,"invited_by"?: string | null,"token"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "household_invites_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    }
                  ]
                },"household_members": {
                  Row: {
                    "household_id": string,"joined_at": string,"role": Database["public"]['Enums']["household_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "household_id": string,"joined_at"?: string,"role"?: Database["public"]['Enums']["household_role"],"user_id": string
                  }
                  Update: {
                    "household_id"?: string,"joined_at"?: string,"role"?: Database["public"]['Enums']["household_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "household_members_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    }
                  ]
                },"households": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"name": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"email": string,"id": string,"name": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email": string,"id": string,"name"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"id"?: string,"name"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"recipes": {
                  Row: {
                    "cook_min": number | null,"created_at": string,"created_by": string | null,"description": string | null,"household_id": string,"id": string,"notes": string | null,"photo_url": string | null,"prep_min": number | null,"servings": number | null,"source_author": string | null,"source_type": Database["public"]['Enums']["recipe_source_type"],"source_url": string | null,"steps_style": Database["public"]['Enums']["recipe_steps_style"],"title": string,"total_min": number | null,"updated_at": string,"updated_by": string | null,"visibility": Database["public"]['Enums']["recipe_visibility"],"yield_qty": number | null,"yield_unit_label": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cook_min"?: number | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"household_id": string,"id"?: string,"notes"?: string | null,"photo_url"?: string | null,"prep_min"?: number | null,"servings"?: number | null,"source_author"?: string | null,"source_type"?: Database["public"]['Enums']["recipe_source_type"],"source_url"?: string | null,"steps_style"?: Database["public"]['Enums']["recipe_steps_style"],"title": string,"total_min"?: number | null,"updated_at"?: string,"updated_by"?: string | null,"visibility"?: Database["public"]['Enums']["recipe_visibility"],"yield_qty"?: number | null,"yield_unit_label"?: string | null
                  }
                  Update: {
                    "cook_min"?: number | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"household_id"?: string,"id"?: string,"notes"?: string | null,"photo_url"?: string | null,"prep_min"?: number | null,"servings"?: number | null,"source_author"?: string | null,"source_type"?: Database["public"]['Enums']["recipe_source_type"],"source_url"?: string | null,"steps_style"?: Database["public"]['Enums']["recipe_steps_style"],"title"?: string,"total_min"?: number | null,"updated_at"?: string,"updated_by"?: string | null,"visibility"?: Database["public"]['Enums']["recipe_visibility"],"yield_qty"?: number | null,"yield_unit_label"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "recipes_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "accept_invite":
{ Args: { "p_leave_current"?: boolean,"p_token": string }; Returns: string
                           },
"create_household":
{ Args: { "p_name": string }; Returns: string
                           },
"create_invite":
{ Args: { "p_email": string }; Returns: string
                           },
"current_user_email":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"get_invite":
{ Args: { "p_token": string }; Returns: {
              "accepted_at": string,"email": string,"expires_at": string,"household_id": string,"household_name": string,"invited_by_name": string
            }[]
                           },
"is_household_member":
{ Args: { "p_household_id": string }; Returns: boolean
                           },
"leave_household":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"my_pending_invites":
{ Args: Record<PropertyKey, never>; Returns: {
              "expires_at": string,"household_name": string,"invited_by_name": string,"token": string
            }[]
                           },
"shares_household_with":
{ Args: { "p_user_id": string }; Returns: boolean
                           }
          }
          Enums: {
            "household_role": "owner"|"member","recipe_source_type": "manual"|"web"|"instagram","recipe_steps_style": "full"|"short","recipe_visibility": "household"|"public"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "household_role": ["owner", "member"],"recipe_source_type": ["manual", "web", "instagram"],"recipe_steps_style": ["full", "short"],"recipe_visibility": ["household", "public"]
          }
        }
} as const
