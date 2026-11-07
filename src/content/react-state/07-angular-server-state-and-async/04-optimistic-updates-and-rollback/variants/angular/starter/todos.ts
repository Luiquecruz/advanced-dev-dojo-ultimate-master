import { Injectable, InjectionToken, inject, signal } from '@angular/core';

export interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

export const SAVE_TODO = new InjectionToken<(todo: Todo) => Promise<void>>('SAVE_TODO');

@Injectable({ providedIn: 'root' })
export class TodoStore {
  private readonly save = inject(SAVE_TODO);

  // TODO: private signals plus read-only `todos` and `error`

  load(todos: Todo[]) {
    // TODO
  }

  async toggle(id: number) {
    // TODO: snapshot, apply immediately, save, roll back only this todo on failure
  }
}
