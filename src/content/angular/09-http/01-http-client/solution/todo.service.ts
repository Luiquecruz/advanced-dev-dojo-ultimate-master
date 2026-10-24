import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

@Injectable({ providedIn: 'root' })
export class TodoService {
  private readonly http = inject(HttpClient);

  getAll(): Observable<Todo[]> {
    return this.http.get<Todo[]>('/api/todos');
  }

  add(title: string): Observable<Todo> {
    return this.http.post<Todo>('/api/todos', { title });
  }

  toggle(todo: Todo): Observable<Todo> {
    return this.http.patch<Todo>(`/api/todos/${todo.id}`, { completed: !todo.completed });
  }
}
