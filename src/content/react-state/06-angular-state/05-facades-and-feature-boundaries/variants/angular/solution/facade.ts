import { Injectable, InjectionToken, computed, inject, signal } from '@angular/core';

export interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

export type Status = 'idle' | 'loading' | 'ready' | 'error';

export const TODO_API = new InjectionToken<{ list(): Promise<Todo[]> }>('TODO_API');

@Injectable({ providedIn: 'root' })
export class TodosStore {
  private readonly state = signal<Status>('idle');
  private readonly list = signal<Todo[]>([]);

  readonly status = this.state.asReadonly();
  readonly items = this.list.asReadonly();

  setStatus(status: Status) {
    this.state.set(status);
  }

  setItems(items: Todo[]) {
    this.list.set(items);
  }

  toggle(id: number) {
    this.list.update((items) => items.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)));
  }
}

@Injectable({ providedIn: 'root' })
export class TodosFacade {
  private readonly store = inject(TodosStore);
  private readonly api = inject(TODO_API);

  readonly vm = computed(() => ({
    status: this.store.status(),
    items: this.store.items(),
    remaining: this.store.items().filter((todo) => !todo.completed).length,
  }));

  async load() {
    this.store.setStatus('loading');
    try {
      const items = await this.api.list();
      this.store.setItems(items);
      this.store.setStatus('ready');
    } catch {
      this.store.setStatus('error');
    }
  }

  toggle(id: number) {
    this.store.toggle(id);
  }
}
