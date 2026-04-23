export interface Task {
  id: string;
  title: string;
  assigned_to: string; // UID of the assigned user
  assigned_to_name: string; // Display name for rendering
  created_by: string; // UID of admin who created it
  due_date: string | null; // ISO date string e.g. "2026-05-01"
  difficulty: 'Easy' | 'Medium' | 'Hard';
  status: 'pending' | 'completed';
  created_at: string;
}

export interface CreateTaskPayload {
  title: string;
  assigned_to: string;
  due_date: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}
