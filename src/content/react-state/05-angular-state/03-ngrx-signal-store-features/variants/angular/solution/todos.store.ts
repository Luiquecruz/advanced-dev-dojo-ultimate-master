import { HttpClient } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { removeEntity, setAllEntities, updateEntity, withEntities } from '@ngrx/signals/entities';
import { firstValueFrom } from 'rxjs';

export interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

export type TodoFilter = 'all' | 'active' | 'completed';

export const TodosStore = signalStore(
  { providedIn: 'root' },
  withEntities<Todo>(),
  withState({ filter: 'all' as TodoFilter, loading: false }),
  withComputed(({ entities, filter }) => ({
    remainingCount: computed(() => entities().filter((todo) => !todo.completed).length),
    visibleTodos: computed(() => {
      const todos = entities();
      switch (filter()) {
        case 'active':
          return todos.filter((todo) => !todo.completed);
        case 'completed':
          return todos.filter((todo) => todo.completed);
        default:
          return todos;
      }
    }),
  })),
  withMethods((store, http = inject(HttpClient)) => ({
    async load() {
      patchState(store, { loading: true });
      const todos = await firstValueFrom(http.get<Todo[]>('/api/todos'));
      patchState(store, setAllEntities(todos), { loading: false });
    },
    toggle(id: number) {
      patchState(store, updateEntity({ id, changes: (todo) => ({ completed: !todo.completed }) }));
    },
    remove(id: number) {
      patchState(store, removeEntity(id));
    },
    setFilter(filter: TodoFilter) {
      patchState(store, { filter });
    },
  })),
  withHooks({
    onInit(store) {
      store.load();
    },
  }),
);
