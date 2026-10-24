import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TodoStore } from './todo-store';

@Component({
  selector: 'app-todo-list',
  template: `
    <input #title aria-label="New todo" />
    <!-- TODO: Add button that calls store.add(title.value) and clears the input -->
    <ul>
      <!-- TODO: one <li> per todo; clicking it toggles the todo -->
    </ul>
    <p>{{ remaining() }} remaining</p>
  `,
})
export class TodoList {
  protected readonly store = inject(TodoStore);
  protected readonly todos = toSignal(this.store.todos$, { initialValue: [] });
  protected readonly remaining = toSignal(this.store.remaining$, { initialValue: 0 });
}
