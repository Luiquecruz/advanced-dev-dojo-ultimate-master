import { Component, computed, signal } from '@angular/core';

type Priority = 'high' | 'normal' | 'low';

interface Task {
  id: number;
  title: string;
  done: boolean;
  priority: Priority;
}

@Component({
  selector: 'app-task-list',
  template: `
    <nav>
      <button (click)="filter.set('all')">All</button>
      <button (click)="filter.set('open')">Open</button>
      <button (click)="filter.set('done')">Done</button>
    </nav>
    <ul>
      <!-- TODO: @for over visibleTasks() tracked by id, with @switch badges and @empty -->
    </ul>
    <!-- TODO: @let open = openCount(); then @if / @else for the summary -->
  `,
})
export class TaskList {
  readonly tasks = signal<Task[]>([
    { id: 1, title: 'Write docs', done: false, priority: 'high' },
    { id: 2, title: 'Fix bug', done: true, priority: 'normal' },
    { id: 3, title: 'Review PR', done: false, priority: 'low' },
  ]);
  readonly filter = signal<'all' | 'open' | 'done'>('all');

  readonly visibleTasks = computed(() => {
    const filter = this.filter();
    return this.tasks().filter((task) => filter === 'all' || (filter === 'done') === task.done);
  });
  readonly openCount = computed(() => this.tasks().filter((task) => !task.done).length);
}
