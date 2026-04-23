export interface Task {
  id: string;
  title: string;
  assigned_to: string;
  created_by: string;
  due_date: string | null;
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
