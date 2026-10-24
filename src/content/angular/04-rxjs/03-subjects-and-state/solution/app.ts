import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TodoStore } from './todo-store';

@Component({
  selector: 'app-todo-list',
  template: `
    <input #title aria-label="New todo" />
    <button (click)="store.add(title.value); title.value = ''">Add</button>
    <ul>
      @for (todo of todos(); track todo.id) {
        <li (click)="store.toggle(todo.id)" [class.done]="todo.completed">{{ todo.title }}</li>
      }
    </ul>
    <p>{{ remaining() }} remaining</p>
  `,
})
export class TodoList {
  protected readonly store = inject(TodoStore);
  protected readonly todos = toSignal(this.store.todos$, { initialValue: [] });
  protected readonly remaining = toSignal(this.store.remaining$, { initialValue: 0 });
}
