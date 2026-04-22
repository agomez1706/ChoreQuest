import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Household, CreateHouseholdPayload, JoinHouseholdPayload } from '../models/household.model';

const API_BASE = '/api/household';

@Injectable({ providedIn: 'root' })
export class HouseholdService {
  private readonly http = inject(HttpClient);
  private readonly _household$ = new BehaviorSubject<Household | null>(null);
  readonly household$ = this._household$.asObservable();

  get currentHousehold(): Household | null {
    return this._household$.getValue();
  }

  loadMyHousehold(): Observable<Household | null> {
    return this.http.get<Household | null>(`${API_BASE}/me/`).pipe(
      tap((h) => this._household$.next(h)),
      catchError(this.handleError),
    );
  }

  createHousehold(payload: CreateHouseholdPayload): Observable<Household> {
    return this.http.post<Household>(`${API_BASE}/create/`, payload).pipe(
      tap((h) => this._household$.next(h)),
      catchError(this.handleError),
    );
  }

  joinHousehold(payload: JoinHouseholdPayload): Observable<Household> {
    return this.http
      .post<Household>(`${API_BASE}/join/`, {
        invite_code: payload.invite_code.toUpperCase().trim(),
      })
      .pipe(
        tap((h) => this._household$.next(h)),
        catchError(this.handleError),
      );
  }

  leaveHousehold(): Observable<{ detail: string }> {
    return this.http.post<{ detail: string }>(`${API_BASE}/leave/`, {}).pipe(
      tap(() => this._household$.next(null)),
      catchError(this.handleError),
    );
  }

  clearHousehold(): void {
    this._household$.next(null);
  }

  private handleError(err: HttpErrorResponse): Observable<never> {
    const msg = err.error?.detail ?? err.error?.message ?? 'An unexpected error occurred.';
    return throwError(() => new Error(msg));
  }
}
