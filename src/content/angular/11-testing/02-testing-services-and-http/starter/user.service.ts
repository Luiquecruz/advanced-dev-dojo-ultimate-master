import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, type Observable } from 'rxjs';

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  protected readonly http = inject(HttpClient);

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>('/api/users');
  }

  getAdmins(): Observable<User[]> {
    return this.getUsers().pipe(map((users) => users.filter((user) => user.role === 'admin')));
  }

  updateName(id: number, name: string): Observable<User> {
    return this.http.patch<User>(`/api/users/${id}`, { name });
  }
}
