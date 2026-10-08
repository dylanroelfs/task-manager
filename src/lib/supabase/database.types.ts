// Handgeschreven op basis van supabase/migrations.
// Vervang door gegenereerde types zodra de CLI gekoppeld is:
//   npx supabase gen types typescript --project-id <id> > src/lib/supabase/database.types.ts

import type { ProjectColor } from "../project-colors";

export type TaskPriority = "low" | "medium" | "high";

export type TaskStatus = "todo" | "in_progress" | "done";

export type Database = {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string;
          user_id: string;
          project_id: string | null;
          assignee_id: string | null;
          title: string;
          description: string | null;
          priority: TaskPriority;
          due_date: string | null;
          status: TaskStatus;
          /** Afgeleid van status door een trigger. */
          done: boolean;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          project_id?: string | null;
          assignee_id?: string | null;
          title: string;
          description?: string | null;
          priority?: TaskPriority;
          due_date?: string | null;
          status?: TaskStatus;
          created_at?: string;
        };
        Update: {
          project_id?: string | null;
          assignee_id?: string | null;
          title?: string;
          description?: string | null;
          priority?: TaskPriority;
          due_date?: string | null;
          status?: TaskStatus;
        };
        Relationships: [];
      };
      profiles: {
        Row: { id: string; email: string; full_name: string | null; created_at: string };
        // Wordt bijgehouden door een trigger op auth.users, niet vanuit de app
        Insert: { id: string; email: string; full_name?: string | null };
        Update: { email?: string; full_name?: string | null };
        Relationships: [];
      };
      projects: {
        Row: { id: string; user_id: string; name: string; color: ProjectColor; created_at: string };
        Insert: { id?: string; user_id?: string; name: string; color?: ProjectColor; created_at?: string };
        Update: { name?: string; color?: ProjectColor };
        Relationships: [];
      };
    };
    Views: {
      projects_with_counts: {
        Row: { id: string; name: string; color: ProjectColor; created_at: string; open_count: number };
        Relationships: [];
      };
    };
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
