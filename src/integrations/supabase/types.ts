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
          organization_id: string
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
          organization_id?: string
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
          organization_id?: string
          personal_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alunos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
          organization_id: string
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
          organization_id?: string
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
          organization_id?: string
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
          {
            foreignKeyName: "avaliacoes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          organization_id: string
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
          organization_id?: string
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
          organization_id?: string
          personal_id?: string
          status?: string
          tipo?: Database["public"]["Enums"]["desafio_tipo"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "desafios_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
          organization_id: string
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
          organization_id?: string
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
          organization_id?: string
          personal_id?: string | null
          recurring?: boolean
          student?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
          category: string | null
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
          organization_id: string | null
          owner_id: string | null
          updated_at: string
          video_id: string | null
          video_path: string | null
          video_url: string | null
        }
        Insert: {
          category?: string | null
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
          organization_id?: string | null
          owner_id?: string | null
          updated_at?: string
          video_id?: string | null
          video_path?: string | null
          video_url?: string | null
        }
        Update: {
          category?: string | null
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
          organization_id?: string | null
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
          {
            foreignKeyName: "exercises_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lancamentos: {
        Row: {
          aluno_id: string | null
          categoria: Database["public"]["Enums"]["lancamento_categoria"]
          competencia: string
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          is_espelho: boolean
          organization_id: string
          origem_lancamento_id: string | null
          pago_em: string | null
          personal_user_id: string | null
          tipo: Database["public"]["Enums"]["lancamento_tipo"]
          updated_at: string
          valor: number
        }
        Insert: {
          aluno_id?: string | null
          categoria: Database["public"]["Enums"]["lancamento_categoria"]
          competencia: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          is_espelho?: boolean
          organization_id: string
          origem_lancamento_id?: string | null
          pago_em?: string | null
          personal_user_id?: string | null
          tipo: Database["public"]["Enums"]["lancamento_tipo"]
          updated_at?: string
          valor: number
        }
        Update: {
          aluno_id?: string | null
          categoria?: Database["public"]["Enums"]["lancamento_categoria"]
          competencia?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          is_espelho?: boolean
          organization_id?: string
          origem_lancamento_id?: string | null
          pago_em?: string | null
          personal_user_id?: string | null
          tipo?: Database["public"]["Enums"]["lancamento_tipo"]
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_origem_lancamento_id_fkey"
            columns: ["origem_lancamento_id"]
            isOneToOne: false
            referencedRelation: "lancamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          logo_url: string | null
          name: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          logo_url?: string | null
          name: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          brand_logo_url: string | null
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
          brand_logo_url?: string | null
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
          brand_logo_url?: string | null
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
      session_exercise_notes: {
        Row: {
          created_at: string
          id: string
          note: string
          session_id: string
          template_exercise_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          note: string
          session_id: string
          template_exercise_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string
          session_id?: string
          template_exercise_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_exercise_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_exercise_notes_template_exercise_id_fkey"
            columns: ["template_exercise_id"]
            isOneToOne: false
            referencedRelation: "workout_template_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      set_logs: {
        Row: {
          completed_at: string
          created_at: string
          duration_seconds: number | null
          exercise_id: number | null
          id: string
          is_extra: boolean
          load: number | null
          notes: string | null
          reps: number | null
          rest_seconds: number | null
          rpe: number | null
          session_id: string
          set_index: number
          started_at: string | null
          template_exercise_id: string | null
        }
        Insert: {
          completed_at?: string
          created_at?: string
          duration_seconds?: number | null
          exercise_id?: number | null
          id?: string
          is_extra?: boolean
          load?: number | null
          notes?: string | null
          reps?: number | null
          rest_seconds?: number | null
          rpe?: number | null
          session_id: string
          set_index: number
          started_at?: string | null
          template_exercise_id?: string | null
        }
        Update: {
          completed_at?: string
          created_at?: string
          duration_seconds?: number | null
          exercise_id?: number | null
          id?: string
          is_extra?: boolean
          load?: number | null
          notes?: string | null
          reps?: number | null
          rest_seconds?: number | null
          rpe?: number | null
          session_id?: string
          set_index?: number
          started_at?: string | null
          template_exercise_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "set_logs_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_logs_template_exercise_id_fkey"
            columns: ["template_exercise_id"]
            isOneToOne: false
            referencedRelation: "workout_template_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      student_workouts: {
        Row: {
          aluno_id: string
          archived_at: string | null
          created_at: string
          id: string
          name: string
          organization_id: string
          personal_id: string
          scheduled_for: string | null
          status: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          aluno_id: string
          archived_at?: string | null
          created_at?: string
          id?: string
          name: string
          organization_id?: string
          personal_id: string
          scheduled_for?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          aluno_id?: string
          archived_at?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
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
            foreignKeyName: "student_workouts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      workout_sessions: {
        Row: {
          aluno_user_id: string
          created_at: string
          duration_seconds: number | null
          finished_at: string | null
          id: string
          notes: string | null
          organization_id: string
          rpe: number | null
          started_at: string
          status: string
          student_workout_id: string
          updated_at: string
        }
        Insert: {
          aluno_user_id: string
          created_at?: string
          duration_seconds?: number | null
          finished_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          rpe?: number | null
          started_at?: string
          status?: string
          student_workout_id: string
          updated_at?: string
        }
        Update: {
          aluno_user_id?: string
          created_at?: string
          duration_seconds?: number | null
          finished_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          rpe?: number | null
          started_at?: string
          status?: string
          student_workout_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_student_workout_id_fkey"
            columns: ["student_workout_id"]
            isOneToOne: false
            referencedRelation: "student_workouts"
            referencedColumns: ["id"]
          },
        ]
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
          per_set: Json | null
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
          per_set?: Json | null
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
          per_set?: Json | null
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
          allow_add_sets: boolean
          allow_pdf: boolean
          allow_rpe: boolean
          aluno_id: string | null
          category: string | null
          created_at: string
          description: string | null
          duration_min: number | null
          duration_weeks: number | null
          goal: string | null
          id: string
          kind: string
          level: string | null
          name: string
          organization_id: string
          periodize: boolean
          personal_id: string
          slug: string | null
          start_date: string | null
          track_set_time: boolean
          updated_at: string
        }
        Insert: {
          allow_add_sets?: boolean
          allow_pdf?: boolean
          allow_rpe?: boolean
          aluno_id?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          duration_min?: number | null
          duration_weeks?: number | null
          goal?: string | null
          id?: string
          kind?: string
          level?: string | null
          name: string
          organization_id?: string
          periodize?: boolean
          personal_id: string
          slug?: string | null
          start_date?: string | null
          track_set_time?: boolean
          updated_at?: string
        }
        Update: {
          allow_add_sets?: boolean
          allow_pdf?: boolean
          allow_rpe?: boolean
          aluno_id?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          duration_min?: number | null
          duration_weeks?: number | null
          goal?: string | null
          id?: string
          kind?: string
          level?: string | null
          name?: string
          organization_id?: string
          periodize?: boolean
          personal_id?: string
          slug?: string | null
          start_date?: string | null
          track_set_time?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_templates_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      current_user_org_id: { Args: never; Returns: string }
      current_user_primary_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      gen_workout_template_slug: { Args: { _kind: string }; Returns: string }
      has_org_role: {
        Args: {
          _org_id: string
          _role: Database["public"]["Enums"]["org_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      shares_org_with: {
        Args: { _other_user: string; _user_id: string }
        Returns: boolean
      }
      solo_org_for_personal: { Args: { _user_id: string }; Returns: string }
    }
    Enums: {
      app_role: "personal" | "aluno" | "owner" | "staff" | "super_admin"
      desafio_tipo: "treino_realizado"
      lancamento_categoria:
        | "mensalidade"
        | "repasse_personal"
        | "salario"
        | "particular"
        | "outros"
      lancamento_tipo: "receita" | "despesa"
      org_role: "owner" | "personal" | "staff"
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
      app_role: ["personal", "aluno", "owner", "staff", "super_admin"],
      desafio_tipo: ["treino_realizado"],
      lancamento_categoria: [
        "mensalidade",
        "repasse_personal",
        "salario",
        "particular",
        "outros",
      ],
      lancamento_tipo: ["receita", "despesa"],
      org_role: ["owner", "personal", "staff"],
    },
  },
} as const
