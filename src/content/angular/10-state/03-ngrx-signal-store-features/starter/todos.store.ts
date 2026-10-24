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
  // TODO: withEntities<Todo>()
  withState({ filter: 'all' as TodoFilter, loading: false }),
  // TODO: withComputed -> remainingCount and visibleTodos
  // TODO: withMethods -> load(), toggle(id), remove(id), setFilter(filter)
  // TODO: withHooks -> call load() in onInit
);
