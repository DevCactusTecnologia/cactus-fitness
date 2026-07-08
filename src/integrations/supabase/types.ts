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
      aluno_check_ins: {
        Row: {
          check_in_date: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          check_in_date?: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          check_in_date?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      alunos: {
        Row: {
          aluno_user_id: string | null
          birth_date: string | null
          created_at: string
          email: string | null
          full_name: string
          gender: string | null
          id: string
          is_active: boolean
          notes: string | null
          objective: string | null
          personal_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          aluno_user_id?: string | null
          birth_date?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          gender?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          objective?: string | null
          personal_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          aluno_user_id?: string | null
          birth_date?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          objective?: string | null
          personal_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      avaliacoes: {
        Row: {
          aluno_id: string
          assessment_date: string
          banco_wells: Json
          composicao_corporal: Json
          created_at: string
          dinamometria: Json
          fotos: Json
          ia_analysis: string | null
          ia_visible_to_aluno: boolean
          id: string
          mode: string
          neuromotora: Json
          perimetros: Json
          personal_id: string
          peso_osseo: Json
          postural: Json
          teste_rm: Json
          updated_at: string
          vo2max: Json
        }
        Insert: {
          aluno_id: string
          assessment_date?: string
          banco_wells?: Json
          composicao_corporal?: Json
          created_at?: string
          dinamometria?: Json
          fotos?: Json
          ia_analysis?: string | null
          ia_visible_to_aluno?: boolean
          id?: string
          mode?: string
          neuromotora?: Json
          perimetros?: Json
          personal_id: string
          peso_osseo?: Json
          postural?: Json
          teste_rm?: Json
          updated_at?: string
          vo2max?: Json
        }
        Update: {
          aluno_id?: string
          assessment_date?: string
          banco_wells?: Json
          composicao_corporal?: Json
          created_at?: string
          dinamometria?: Json
          fotos?: Json
          ia_analysis?: string | null
          ia_visible_to_aluno?: boolean
          id?: string
          mode?: string
          neuromotora?: Json
          perimetros?: Json
          personal_id?: string
          peso_osseo?: Json
          postural?: Json
          teste_rm?: Json
          updated_at?: string
          vo2max?: Json
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
        ]
      }
      desafio_participantes: {
        Row: {
          aluno_id: string
          created_at: string
          desafio_id: string
          pontos: number
        }
        Insert: {
          aluno_id: string
          created_at?: string
          desafio_id: string
          pontos?: number
        }
        Update: {
          aluno_id?: string
          created_at?: string
          desafio_id?: string
          pontos?: number
        }
        Relationships: [
          {
            foreignKeyName: "desafio_participantes_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "desafio_participantes_desafio_id_fkey"
            columns: ["desafio_id"]
            isOneToOne: false
            referencedRelation: "desafios"
            referencedColumns: ["id"]
          },
        ]
      }
      desafios: {
        Row: {
          created_at: string
          data_encerramento: string | null
          descricao: string | null
          id: string
          nome: string
          personal_id: string
          status: string
          tipo: Database["public"]["Enums"]["desafio_tipo"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_encerramento?: string | null
          descricao?: string | null
          id?: string
          nome: string
          personal_id: string
          status?: string
          tipo?: Database["public"]["Enums"]["desafio_tipo"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_encerramento?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          personal_id?: string
          status?: string
          tipo?: Database["public"]["Enums"]["desafio_tipo"]
          updated_at?: string
        }
        Relationships: []
      }
      equipments: {
        Row: {
          created_at: string
          id: number
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: number
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      events: {
        Row: {
          color: number
          created_at: string
          description: string | null
          event_date: string
          event_time: string
          id: string
          is_public: boolean
          location: string | null
          multi_day: boolean
          personal_id: string | null
          recurring: boolean
          student: string | null
          title: string
          updated_at: string
        }
        Insert: {
          color?: number
          created_at?: string
          description?: string | null
          event_date: string
          event_time: string
          id?: string
          is_public?: boolean
          location?: string | null
          multi_day?: boolean
          personal_id?: string | null
          recurring?: boolean
          student?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          color?: number
          created_at?: string
          description?: string | null
          event_date?: string
          event_time?: string
          id?: string
          is_public?: boolean
          location?: string | null
          multi_day?: boolean
          personal_id?: string | null
          recurring?: boolean
          student?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      exercise_groups: {
        Row: {
          created_at: string
          id: number
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id: number
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      exercises: {
        Row: {
          created_at: string
          description: string | null
          difficulty: string | null
          equipment: string | null
          group_id: number
          id: number
          image_path: string | null
          instructions: string | null
          is_active: boolean
          muscles_primary: string[]
          muscles_secondary: string[]
          name: string
          objective: string | null
          owner_id: string | null
          updated_at: string
          video_id: string | null
          video_path: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          difficulty?: string | null
          equipment?: string | null
          group_id: number
          id?: number
          image_path?: string | null
          instructions?: string | null
          is_active?: boolean
          muscles_primary?: string[]
          muscles_secondary?: string[]
          name: string
          objective?: string | null
          owner_id?: string | null
          updated_at?: string
          video_id?: string | null
          video_path?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          difficulty?: string | null
          equipment?: string | null
          group_id?: number
          id?: number
          image_path?: string | null
          instructions?: string | null
          is_active?: boolean
          muscles_primary?: string[]
          muscles_secondary?: string[]
          name?: string
          objective?: string | null
          owner_id?: string | null
          updated_at?: string
          video_id?: string | null
          video_path?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "exercise_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          brand_title: string | null
          created_at: string
          cref: string | null
          full_name: string | null
          id: string
          phone: string | null
          primary_color: string | null
          show_brand_title: boolean
          specialties: string[]
          updated_at: string
          visible_sections: Json | null
          welcome_message: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          brand_title?: string | null
          created_at?: string
          cref?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          primary_color?: string | null
          show_brand_title?: boolean
          specialties?: string[]
          updated_at?: string
          visible_sections?: Json | null
          welcome_message?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          brand_title?: string | null
          created_at?: string
          cref?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          primary_color?: string | null
          show_brand_title?: boolean
          specialties?: string[]
          updated_at?: string
          visible_sections?: Json | null
          welcome_message?: string | null
        }
        Relationships: []
      }
      student_workouts: {
        Row: {
          aluno_id: string
          created_at: string
          id: string
          name: string
          personal_id: string
          scheduled_for: string | null
          status: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          aluno_id: string
          created_at?: string
          id?: string
          name: string
          personal_id: string
          scheduled_for?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          aluno_id?: string
          created_at?: string
          id?: string
          name?: string
          personal_id?: string
          scheduled_for?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_workouts_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_workouts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
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
      workout_template_exercises: {
        Row: {
          block_label: string | null
          block_position: number
          created_at: string
          exercise_id: number | null
          id: string
          load: string | null
          notes: string | null
          position: number
          reps: string | null
          rest_seconds: number | null
          session_label: string | null
          session_position: number
          sets: number | null
          template_id: string
        }
        Insert: {
          block_label?: string | null
          block_position?: number
          created_at?: string
          exercise_id?: number | null
          id?: string
          load?: string | null
          notes?: string | null
          position?: number
          reps?: string | null
          rest_seconds?: number | null
          session_label?: string | null
          session_position?: number
          sets?: number | null
          template_id: string
        }
        Update: {
          block_label?: string | null
          block_position?: number
          created_at?: string
          exercise_id?: number | null
          id?: string
          load?: string | null
          notes?: string | null
          position?: number
          reps?: string | null
          rest_seconds?: number | null
          session_label?: string | null
          session_position?: number
          sets?: number | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_template_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_template_exercises_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_templates: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          duration_min: number | null
          goal: string | null
          id: string
          kind: string
          level: string | null
          name: string
          periodize: boolean
          personal_id: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          duration_min?: number | null
          goal?: string | null
          id?: string
          kind?: string
          level?: string | null
          name: string
          periodize?: boolean
          personal_id: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          duration_min?: number | null
          goal?: string | null
          id?: string
          kind?: string
          level?: string | null
          name?: string
          periodize?: boolean
          personal_id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "personal" | "aluno"
      desafio_tipo: "treino_realizado"
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
      app_role: ["personal", "aluno"],
      desafio_tipo: ["treino_realizado"],
    },
  },
} as const
