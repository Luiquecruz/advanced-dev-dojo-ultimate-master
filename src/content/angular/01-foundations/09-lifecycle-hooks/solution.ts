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
export class AutoRefresh implements OnChanges, OnInit {
  readonly label = input('Feed');
  readonly intervalMs = input(1000);
  readonly ticks = signal(0);
  readonly changes = signal<string[]>([]);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      this.host.nativeElement.querySelector('input')?.focus();
    });
  }

  ngOnChanges(changes: SimpleChanges<AutoRefresh>) {
    const change = changes.label;
    if (change && !change.firstChange) {
      this.changes.update((list) => [...list, `label: ${change.previousValue} → ${change.currentValue}`]);
    }
  }

  ngOnInit() {
    const timerId = setInterval(() => this.ticks.update((ticks) => ticks + 1), this.intervalMs());
    this.destroyRef.onDestroy(() => clearInterval(timerId));
  }
}
