import { provideHttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { TodosStore } from './todos.store';

export const appConfig = { providers: [provideHttpClient()] };

@Component({
  selector: 'app-todo-list',
  template: `
    @if (store.loading()) {
      <p>Loading...</p>
    }
    <p>{{ store.remainingCount() }} remaining</p>
    <nav>
      <button (click)="store.setFilter('all')">All</button>
      <button (click)="store.setFilter('active')">Active</button>
      <button (click)="store.setFilter('completed')">Completed</button>
    </nav>
    <ul>
      @for (todo of store.visibleTodos(); track todo.id) {
        <li>
          <label>
            <input type="checkbox" [checked]="todo.completed" (change)="store.toggle(todo.id)" />
            {{ todo.title }}
          </label>
          <button [attr.aria-label]="'Delete ' + todo.title" (click)="store.remove(todo.id)">x</button>
        </li>
      }
    </ul>
  `,
})
export class TodoList {
  protected readonly store = inject(TodosStore);
}
