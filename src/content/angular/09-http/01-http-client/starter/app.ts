import { ApplicationConfig, Component, inject, signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { Todo, TodoService } from './todo.service';

@Component({
  selector: 'app-todo-list',
  template: `
    <form (submit)="add($event)">
      <label>New todo <input #title name="title" /></label>
      <button type="submit">Add</button>
    </form>
    <ul>
      @for (todo of todos(); track todo.id) {
        <li>
          <label>
            <input type="checkbox" [checked]="todo.completed" (change)="toggle(todo)" />
            {{ todo.title }}
          </label>
        </li>
      }
    </ul>
  `,
})
export class TodoList {
  private readonly todoService = inject(TodoService);
  protected readonly todos = signal<Todo[]>([]);

  constructor() {
    // TODO: load every todo with todoService.getAll() and store them in the todos signal
  }

  add(event: Event) {
    event.preventDefault();
    const input = (event.target as HTMLFormElement).elements.namedItem('title') as HTMLInputElement;
    // TODO: call todoService.add(input.value), append the created todo and clear the input
  }

  toggle(todo: Todo) {
    // TODO: call todoService.toggle(todo) and replace the matching todo with the server response
  }
}

export const appConfig: ApplicationConfig = {
  // TODO: provide HttpClient
  providers: [],
};
