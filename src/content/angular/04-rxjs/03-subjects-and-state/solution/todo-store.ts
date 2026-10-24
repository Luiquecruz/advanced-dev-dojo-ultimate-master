import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';

export interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

@Injectable({ providedIn: 'root' })
export class TodoStore {
  private readonly state = new BehaviorSubject<Todo[]>([]);
  private nextId = 1;

  readonly todos$: Observable<Todo[]> = this.state.asObservable();
  readonly remaining$: Observable<number> = this.todos$.pipe(map((todos) => todos.filter((todo) => !todo.completed).length));

  add(title: string) {
    this.state.next([...this.state.value, { id: this.nextId++, title, completed: false }]);
  }

  toggle(id: number) {
    this.state.next(this.state.value.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)));
  }
}
