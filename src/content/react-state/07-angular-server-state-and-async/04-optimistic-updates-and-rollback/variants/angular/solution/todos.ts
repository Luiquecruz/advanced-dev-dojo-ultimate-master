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

  private readonly list = signal<Todo[]>([]);
  private readonly failure = signal<string | null>(null);

  readonly todos = this.list.asReadonly();
  readonly error = this.failure.asReadonly();

  load(todos: Todo[]) {
    this.list.set(todos);
  }

  async toggle(id: number) {
    const before = this.list().find((todo) => todo.id === id);
    if (!before) return;
    this.failure.set(null);
    this.patch(id, { completed: !before.completed });
    try {
      await this.save({ ...before, completed: !before.completed });
    } catch {
      this.patch(id, { completed: before.completed });
      this.failure.set('Could not save the change.');
    }
  }

  private patch(id: number, changes: Partial<Todo>) {
    this.list.update((todos) => todos.map((todo) => (todo.id === id ? { ...todo, ...changes } : todo)));
  }
}
