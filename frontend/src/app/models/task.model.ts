export interface Task {
  id: string;
  title: string;
  assigned_to: string;
  created_by: string;
  due_date: string | null;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  status: 'pending' | 'completed';
  created_at: string;
  points: number;
  is_recurring: boolean;
  recurrence_interval_days: number | null;
}

export interface CreateTaskPayload {
  title: string;
  assigned_to: string;
  due_date: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  points: number;
  is_recurring: boolean;
  recurrence_interval_days: number | null;
}
