import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Task, CreateTaskPayload } from '../models/task.model';

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

  completeTask(taskId: string): Observable<{ detail: string }> {
    return this.http.post<{ detail: string }>(`${API_BASE}/${taskId}/complete/`, {}).pipe(
      tap(() => {
        const updated = this._tasks$
          .getValue()
          .map((t) => (t.id === taskId ? { ...t, status: 'completed' as const } : t));
        this._tasks$.next(updated);
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
