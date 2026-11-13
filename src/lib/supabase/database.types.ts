
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
            "categories": {
                  Row: {
                    "household_id": string | null,"id": string,"name": string,"position": number
                  }
                  ComputedFields: never
                  Insert: {
                    "household_id"?: string | null,"id"?: string,"name": string,"position"?: number
                  }
                  Update: {
                    "household_id"?: string | null,"id"?: string,"name"?: string,"position"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "categories_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    }
                  ]
                },"household_invites": {
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
                },"import_jobs": {
                  Row: {
                    "created_at": string,"created_by": string,"error": string | null,"household_id": string,"id": string,"parsed_json": Json | null,"raw_text": string | null,"source_type": Database["public"]['Enums']["recipe_source_type"],"status": string,"url": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by": string,"error"?: string | null,"household_id": string,"id"?: string,"parsed_json"?: Json | null,"raw_text"?: string | null,"source_type"?: Database["public"]['Enums']["recipe_source_type"],"status"?: string,"url": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"error"?: string | null,"household_id"?: string,"id"?: string,"parsed_json"?: Json | null,"raw_text"?: string | null,"source_type"?: Database["public"]['Enums']["recipe_source_type"],"status"?: string,"url"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "import_jobs_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    }
                  ]
                },"ingredient_macros": {
                  Row: {
                    "carbs_g": number | null,"fat_g": number | null,"ingredient_id": string,"kcal": number | null,"protein_g": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "carbs_g"?: number | null,"fat_g"?: number | null,"ingredient_id": string,"kcal"?: number | null,"protein_g"?: number | null
                  }
                  Update: {
                    "carbs_g"?: number | null,"fat_g"?: number | null,"ingredient_id"?: string,"kcal"?: number | null,"protein_g"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "ingredient_macros_ingredient_id_fkey"
      columns: ["ingredient_id"]
isOneToOne: true
      referencedRelation: "ingredients"
      referencedColumns: ["id"]
    }
                  ]
                },"ingredient_portions": {
                  Row: {
                    "grams": number,"id": string,"ingredient_id": string,"label": string | null,"unit_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "grams": number,"id"?: string,"ingredient_id": string,"label"?: string | null,"unit_id"?: string | null
                  }
                  Update: {
                    "grams"?: number,"id"?: string,"ingredient_id"?: string,"label"?: string | null,"unit_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "ingredient_portions_ingredient_id_fkey"
      columns: ["ingredient_id"]
isOneToOne: false
      referencedRelation: "ingredients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ingredient_portions_unit_id_fkey"
      columns: ["unit_id"]
isOneToOne: false
      referencedRelation: "units"
      referencedColumns: ["id"]
    }
                  ]
                },"ingredients": {
                  Row: {
                    "aisle": string | null,"created_at": string,"density_g_per_ml": number | null,"fdc_id": number | null,"household_id": string | null,"id": string,"is_common": boolean,"name": string,"search_text": string,"synonyms": (string)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "aisle"?: string | null,"created_at"?: string,"density_g_per_ml"?: number | null,"fdc_id"?: number | null,"household_id"?: string | null,"id"?: string,"is_common"?: boolean,"name": string,"search_text"?: string,"synonyms"?: (string)[]
                  }
                  Update: {
                    "aisle"?: string | null,"created_at"?: string,"density_g_per_ml"?: number | null,"fdc_id"?: number | null,"household_id"?: string | null,"id"?: string,"is_common"?: boolean,"name"?: string,"search_text"?: string,"synonyms"?: (string)[]
                  }
                  Relationships: [
                    {
      foreignKeyName: "ingredients_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    }
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
                },"recipe_categories": {
                  Row: {
                    "category_id": string,"recipe_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id": string,"recipe_id": string
                  }
                  Update: {
                    "category_id"?: string,"recipe_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "recipe_categories_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recipe_categories_recipe_id_fkey"
      columns: ["recipe_id"]
isOneToOne: false
      referencedRelation: "recipes"
      referencedColumns: ["id"]
    }
                  ]
                },"recipe_ingredients": {
                  Row: {
                    "grams": number | null,"id": string,"ingredient_id": string,"note": string | null,"optional": boolean,"position": number,"qty_max": number | null,"qty_min": number | null,"raw_text": string | null,"recipe_id": string,"section_id": string | null,"unit_id": string | null,"unit_label": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "grams"?: number | null,"id"?: string,"ingredient_id": string,"note"?: string | null,"optional"?: boolean,"position": number,"qty_max"?: number | null,"qty_min"?: number | null,"raw_text"?: string | null,"recipe_id": string,"section_id"?: string | null,"unit_id"?: string | null,"unit_label"?: string | null
                  }
                  Update: {
                    "grams"?: number | null,"id"?: string,"ingredient_id"?: string,"note"?: string | null,"optional"?: boolean,"position"?: number,"qty_max"?: number | null,"qty_min"?: number | null,"raw_text"?: string | null,"recipe_id"?: string,"section_id"?: string | null,"unit_id"?: string | null,"unit_label"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "recipe_ingredients_ingredient_id_fkey"
      columns: ["ingredient_id"]
isOneToOne: false
      referencedRelation: "ingredients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recipe_ingredients_recipe_id_fkey"
      columns: ["recipe_id"]
isOneToOne: false
      referencedRelation: "recipes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recipe_ingredients_section_id_fkey"
      columns: ["section_id"]
isOneToOne: false
      referencedRelation: "recipe_sections"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recipe_ingredients_unit_id_fkey"
      columns: ["unit_id"]
isOneToOne: false
      referencedRelation: "units"
      referencedColumns: ["id"]
    }
                  ]
                },"recipe_sections": {
                  Row: {
                    "id": string,"position": number,"recipe_id": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"position": number,"recipe_id": string,"title": string
                  }
                  Update: {
                    "id"?: string,"position"?: number,"recipe_id"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "recipe_sections_recipe_id_fkey"
      columns: ["recipe_id"]
isOneToOne: false
      referencedRelation: "recipes"
      referencedColumns: ["id"]
    }
                  ]
                },"recipe_steps": {
                  Row: {
                    "id": string,"position": number,"recipe_id": string,"section_id": string | null,"text": string,"timer_sec": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"position": number,"recipe_id": string,"section_id"?: string | null,"text": string,"timer_sec"?: number | null
                  }
                  Update: {
                    "id"?: string,"position"?: number,"recipe_id"?: string,"section_id"?: string | null,"text"?: string,"timer_sec"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "recipe_steps_recipe_id_fkey"
      columns: ["recipe_id"]
isOneToOne: false
      referencedRelation: "recipes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recipe_steps_section_id_fkey"
      columns: ["section_id"]
isOneToOne: false
      referencedRelation: "recipe_sections"
      referencedColumns: ["id"]
    }
                  ]
                },"recipe_tags": {
                  Row: {
                    "recipe_id": string,"tag_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "recipe_id": string,"tag_id": string
                  }
                  Update: {
                    "recipe_id"?: string,"tag_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "recipe_tags_recipe_id_fkey"
      columns: ["recipe_id"]
isOneToOne: false
      referencedRelation: "recipes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recipe_tags_tag_id_fkey"
      columns: ["tag_id"]
isOneToOne: false
      referencedRelation: "tags"
      referencedColumns: ["id"]
    }
                  ]
                },"recipes": {
                  Row: {
                    "cook_min": number | null,"created_at": string,"created_by": string | null,"description": string | null,"household_id": string,"id": string,"is_favorite": boolean,"notes": string | null,"nutrition_carbs_g": number | null,"nutrition_fat_g": number | null,"nutrition_kcal": number | null,"nutrition_protein_g": number | null,"nutrition_source": string | null,"photo_url": string | null,"prep_min": number | null,"servings": number | null,"source_author": string | null,"source_type": Database["public"]['Enums']["recipe_source_type"],"source_url": string | null,"steps_style": Database["public"]['Enums']["recipe_steps_style"],"title": string,"total_min": number | null,"updated_at": string,"updated_by": string | null,"visibility": Database["public"]['Enums']["recipe_visibility"],"yield_qty": number | null,"yield_unit_label": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cook_min"?: number | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"household_id": string,"id"?: string,"is_favorite"?: boolean,"notes"?: string | null,"nutrition_carbs_g"?: number | null,"nutrition_fat_g"?: number | null,"nutrition_kcal"?: number | null,"nutrition_protein_g"?: number | null,"nutrition_source"?: string | null,"photo_url"?: string | null,"prep_min"?: number | null,"servings"?: number | null,"source_author"?: string | null,"source_type"?: Database["public"]['Enums']["recipe_source_type"],"source_url"?: string | null,"steps_style"?: Database["public"]['Enums']["recipe_steps_style"],"title": string,"total_min"?: number | null,"updated_at"?: string,"updated_by"?: string | null,"visibility"?: Database["public"]['Enums']["recipe_visibility"],"yield_qty"?: number | null,"yield_unit_label"?: string | null
                  }
                  Update: {
                    "cook_min"?: number | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"household_id"?: string,"id"?: string,"is_favorite"?: boolean,"notes"?: string | null,"nutrition_carbs_g"?: number | null,"nutrition_fat_g"?: number | null,"nutrition_kcal"?: number | null,"nutrition_protein_g"?: number | null,"nutrition_source"?: string | null,"photo_url"?: string | null,"prep_min"?: number | null,"servings"?: number | null,"source_author"?: string | null,"source_type"?: Database["public"]['Enums']["recipe_source_type"],"source_url"?: string | null,"steps_style"?: Database["public"]['Enums']["recipe_steps_style"],"title"?: string,"total_min"?: number | null,"updated_at"?: string,"updated_by"?: string | null,"visibility"?: Database["public"]['Enums']["recipe_visibility"],"yield_qty"?: number | null,"yield_unit_label"?: string | null
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
                },"shopping_list_item_sources": {
                  Row: {
                    "id": string,"item_id": string,"recipe_id": string | null,"recipe_title": string | null,"servings_used": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"item_id": string,"recipe_id"?: string | null,"recipe_title"?: string | null,"servings_used"?: number | null
                  }
                  Update: {
                    "id"?: string,"item_id"?: string,"recipe_id"?: string | null,"recipe_title"?: string | null,"servings_used"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "shopping_list_item_sources_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "shopping_list_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shopping_list_item_sources_recipe_id_fkey"
      columns: ["recipe_id"]
isOneToOne: false
      referencedRelation: "recipes"
      referencedColumns: ["id"]
    }
                  ]
                },"shopping_list_items": {
                  Row: {
                    "aisle": string | null,"checked": boolean,"checked_at": string | null,"checked_by": string | null,"created_at": string,"grams": number | null,"id": string,"ingredient_id": string | null,"list_id": string,"name": string,"position": number,"qty_max": number | null,"qty_min": number | null,"unit_id": string | null,"unit_label": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "aisle"?: string | null,"checked"?: boolean,"checked_at"?: string | null,"checked_by"?: string | null,"created_at"?: string,"grams"?: number | null,"id"?: string,"ingredient_id"?: string | null,"list_id": string,"name": string,"position"?: number,"qty_max"?: number | null,"qty_min"?: number | null,"unit_id"?: string | null,"unit_label"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "aisle"?: string | null,"checked"?: boolean,"checked_at"?: string | null,"checked_by"?: string | null,"created_at"?: string,"grams"?: number | null,"id"?: string,"ingredient_id"?: string | null,"list_id"?: string,"name"?: string,"position"?: number,"qty_max"?: number | null,"qty_min"?: number | null,"unit_id"?: string | null,"unit_label"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "shopping_list_items_ingredient_id_fkey"
      columns: ["ingredient_id"]
isOneToOne: false
      referencedRelation: "ingredients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shopping_list_items_list_id_fkey"
      columns: ["list_id"]
isOneToOne: false
      referencedRelation: "shopping_lists"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shopping_list_items_unit_id_fkey"
      columns: ["unit_id"]
isOneToOne: false
      referencedRelation: "units"
      referencedColumns: ["id"]
    }
                  ]
                },"shopping_lists": {
                  Row: {
                    "created_at": string,"created_by": string | null,"household_id": string,"id": string,"is_default": boolean,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"household_id": string,"id"?: string,"is_default"?: boolean,"name": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"household_id"?: string,"id"?: string,"is_default"?: boolean,"name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "shopping_lists_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    }
                  ]
                },"tags": {
                  Row: {
                    "created_at": string,"household_id": string,"id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"household_id": string,"id"?: string,"name": string
                  }
                  Update: {
                    "created_at"?: string,"household_id"?: string,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tags_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    }
                  ]
                },"units": {
                  Row: {
                    "abbrev": string,"display": boolean,"id": string,"kind": Database["public"]['Enums']["unit_kind"],"name": string,"to_base_factor": number
                  }
                  ComputedFields: never
                  Insert: {
                    "abbrev": string,"display"?: boolean,"id": string,"kind": Database["public"]['Enums']["unit_kind"],"name": string,"to_base_factor": number
                  }
                  Update: {
                    "abbrev"?: string,"display"?: boolean,"id"?: string,"kind"?: Database["public"]['Enums']["unit_kind"],"name"?: string,"to_base_factor"?: number
                  }
                  Relationships: [
                    
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
"add_ingredient_to_list":
{ Args: { "p_list_id": string,"p_recipe_ingredient_id": string,"p_servings": number }; Returns: string
                           },
"add_manual_item":
{ Args: { "p_aisle"?: string,"p_list_id": string,"p_name": string }; Returns: string
                           },
"clear_checked_items":
{ Args: { "p_list_id": string }; Returns: number
                           },
"create_category":
{ Args: { "p_name": string }; Returns: string
                           },
"create_household":
{ Args: { "p_name": string }; Returns: string
                           },
"create_ingredient":
{ Args: { "p_carbs"?: number,"p_fat"?: number,"p_kcal"?: number,"p_name": string,"p_protein"?: number }; Returns: string
                           },
"create_invite":
{ Args: { "p_email": string }; Returns: string
                           },
"create_shopping_list":
{ Args: { "p_name": string }; Returns: string
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
"is_shopping_list_member":
{ Args: { "p_list_id": string }; Returns: boolean
                           },
"leave_household":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"my_pending_invites":
{ Args: Record<PropertyKey, never>; Returns: {
              "expires_at": string,"household_name": string,"invited_by_name": string,"token": string
            }[]
                           },
"save_recipe":
{ Args: { "p_data": Json,"p_id": string }; Returns: string
                           },
"search_ingredients":
{ Args: { "p_all"?: boolean,"p_query": string }; Returns: {
              "aisle": string,"custom": boolean,"density_g_per_ml": number,"id": string,"name": string,"portions": Json
            }[]
                           },
"search_recipes":
{ Args: { "p_category"?: string,"p_has"?: string,"p_lacks"?: string,"p_max_min"?: number,"p_query"?: string,"p_sort"?: string }; Returns: {
              "cook_min": number | null,
"created_at": string,
"created_by": string | null,
"description": string | null,
"household_id": string,
"id": string,
"is_favorite": boolean,
"notes": string | null,
"nutrition_carbs_g": number | null,
"nutrition_fat_g": number | null,
"nutrition_kcal": number | null,
"nutrition_protein_g": number | null,
"nutrition_source": string | null,
"photo_url": string | null,
"prep_min": number | null,
"servings": number | null,
"source_author": string | null,
"source_type": Database["public"]['Enums']["recipe_source_type"],
"source_url": string | null,
"steps_style": Database["public"]['Enums']["recipe_steps_style"],
"title": string,
"total_min": number | null,
"updated_at": string,
"updated_by": string | null,
"visibility": Database["public"]['Enums']["recipe_visibility"],
"yield_qty": number | null,
"yield_unit_label": string | null
            }[]
                          SetofOptions: {
        from: "*"
        to: "recipes"
        isOneToOne: false
        isSetofReturn: true
      } },
"set_default_list":
{ Args: { "p_list_id": string }; Returns: undefined
                           },
"shares_household_with":
{ Args: { "p_user_id": string }; Returns: boolean
                           }
          }
          Enums: {
            "household_role": "owner"|"member","recipe_source_type": "manual"|"web"|"instagram","recipe_steps_style": "full"|"short","recipe_visibility": "household"|"public","unit_kind": "mass"|"volume"|"count"
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
            "household_role": ["owner", "member"],"recipe_source_type": ["manual", "web", "instagram"],"recipe_steps_style": ["full", "short"],"recipe_visibility": ["household", "public"],"unit_kind": ["mass", "volume", "count"]
          }
        }
} as const
