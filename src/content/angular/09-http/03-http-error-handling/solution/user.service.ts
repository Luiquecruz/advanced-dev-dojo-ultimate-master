import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, Observable, retry, throwError, timer } from 'rxjs';

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export function toFriendlyError(error: HttpErrorResponse): Error {
  if (error.status === 0) {
    return new Error('Network error, check your connection');
  }
  if (error.status === 404) {
    return new Error('User not found');
  }
  return new Error('Server error, please try again later');
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);

  getUser(id: number): Observable<User> {
    return this.http.get<User>(`/api/users/${id}`).pipe(
      retry({
        count: 2,
        delay: (error: HttpErrorResponse, retryCount) => (error.status >= 500 ? timer(retryCount * 100) : throwError(() => error)),
      }),
      catchError((error: HttpErrorResponse) => throwError(() => toFriendlyError(error))),
    );
  }
}
