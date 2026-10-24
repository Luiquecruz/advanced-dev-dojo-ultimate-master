import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';

export interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

@Injectable({ providedIn: 'root' })
export class TodoStore {
  // TODO: private BehaviorSubject<Todo[]> starting with []
  // TODO: todos$ = read-only observable; remaining$ derived with map
  readonly todos$: Observable<Todo[]> = new Observable<Todo[]>();
  readonly remaining$: Observable<number> = new Observable<number>();

  add(title: string) {
    // TODO: next() a new array with the new todo
  }

  toggle(id: number) {
    // TODO: next() a new array with the toggled todo replaced
  }
}
