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
  // TODO: status 0 -> "Network error, check your connection"
  // TODO: status 404 -> "User not found"
  // TODO: anything else -> "Server error, please try again later"
  return new Error(error.message);
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);

  getUser(id: number): Observable<User> {
    // TODO: retry up to 2 times only for 5xx errors, waiting retryCount * 100 ms (100 ms, then 200 ms)
    // TODO: rethrow every remaining error as toFriendlyError(error)
    return this.http.get<User>(`/api/users/${id}`);
  }
}
