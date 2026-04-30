import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Task, CreateTaskPayload } from '../models/task';

const API_BASE = '/api/tasks';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly http = inject(HttpClient);
  private readonly _tasks$ = new BehaviorSubject<Task[]>([]);
  readonly tasks$ = this._tasks$.asObservable();

  loadHouseholdTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(`${API_BASE}/household/`).pipe(
      tap((tasks) => this._tasks$.next(tasks)),
      catchError(this.handleError),
    );
  }

  createTask(payload: CreateTaskPayload): Observable<Task> {
    return this.http.post<Task>(`${API_BASE}/create/`, payload).pipe(
      tap((newTask) => {
        const current = this._tasks$.getValue();
        this._tasks$.next([newTask, ...current]);
      }),
      catchError(this.handleError),
    );
  }

  completeTask(
    taskId: string,
    currentDueDate: string,
  ): Observable<{ detail: string; points_awarded: number; is_recurring: boolean; task: Task }> {
    return this.http
      .post<{
        detail: string;
        points_awarded: number;
        is_recurring: boolean;
        task: Task;
      }>(`${API_BASE}/${taskId}/complete/`, { due_date: currentDueDate })
      .pipe(
        tap((response) => {
          const currentTasks = this._tasks$.getValue();
          const updatedTasks = currentTasks.map((t) => (t.id === taskId ? response.task : t));
          this._tasks$.next(updatedTasks);
        }),
        catchError(this.handleError),
      );
  }

  updateTask(taskId: string, payload: Partial<Task>): Observable<Task> {
    return this.http.patch<Task>(`${API_BASE}/${taskId}/update/`, payload).pipe(
      tap((updatedTask) => {
        const currentTasks = this._tasks$.getValue();
        const updatedTasksList = currentTasks.map((t) => (t.id === taskId ? updatedTask : t));
        this._tasks$.next(updatedTasksList);
      }),
      catchError(this.handleError),
    );
  }

  deleteTask(taskId: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/${taskId}/delete/`).pipe(
      tap(() => {
        const currentTasks = this._tasks$.getValue();
        const updatedTasksList = currentTasks.filter((t) => t.id !== taskId);
        this._tasks$.next(updatedTasksList);
      }),
      catchError(this.handleError),
    );
  }

  clearTasks(): void {
    this._tasks$.next([]);
  }

  private handleError(err: HttpErrorResponse): Observable<never> {
    const msg = err.error?.detail ?? err.error?.message ?? 'An unexpected error occurred.';
    return throwError(() => new Error(msg));
  }
}
