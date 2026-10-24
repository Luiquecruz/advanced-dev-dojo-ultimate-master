import { Component, DestroyRef, ElementRef, OnChanges, OnInit, SimpleChanges, afterNextRender, inject, input, signal } from '@angular/core';

@Component({
  selector: 'app-auto-refresh',
  template: `
    <h3>{{ label() }}</h3>
    <p class="ticks">Ticks: {{ ticks() }}</p>
    <input aria-label="Filter" />
    <ul>
      @for (change of changes(); track $index) {
        <li>{{ change }}</li>
      }
    </ul>
  `,
})
export class AutoRefresh {
  readonly label = input('Feed');
  readonly intervalMs = input(1000);
  readonly ticks = signal(0);
  readonly changes = signal<string[]>([]);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    // TODO: focus the filter input with afterNextRender
  }

  // TODO: implement OnChanges and OnInit (and clean up the interval on destroy)
}
