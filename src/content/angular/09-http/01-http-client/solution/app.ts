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
    this.todoService.getAll().subscribe((todos) => this.todos.set(todos));
  }

  add(event: Event) {
    event.preventDefault();
    const input = (event.target as HTMLFormElement).elements.namedItem('title') as HTMLInputElement;
    this.todoService.add(input.value).subscribe((todo) => {
      this.todos.update((todos) => [...todos, todo]);
      input.value = '';
    });
  }

  toggle(todo: Todo) {
    this.todoService.toggle(todo).subscribe((updated) => {
      this.todos.update((todos) => todos.map((entry) => (entry.id === updated.id ? updated : entry)));
    });
  }
}

export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient()],
};
