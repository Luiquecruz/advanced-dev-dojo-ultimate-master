import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EMPTY, Observable } from 'rxjs';

export interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

@Injectable({ providedIn: 'root' })
export class TodoService {
  private readonly http = inject(HttpClient);

  getAll(): Observable<Todo[]> {
    // TODO: GET /api/todos
    return EMPTY;
  }

  add(title: string): Observable<Todo> {
    // TODO: POST /api/todos with the body { title }
    return EMPTY;
  }

  toggle(todo: Todo): Observable<Todo> {
    // TODO: PATCH /api/todos/<id> with the body { completed: !todo.completed }
    return EMPTY;
  }
}
