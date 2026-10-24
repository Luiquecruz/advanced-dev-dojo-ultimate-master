import { Component, inject } from '@angular/core';
import { CounterStore } from './counter-store';

@Component({
  selector: 'app-counter-button',
  template: `<button (click)="store.increment()">+1</button>`,
})
export class CounterButton {
  protected readonly store = inject(CounterStore);
}

@Component({
  selector: 'app-counter-display',
  template: `
    @if (store) {
      <p>Count: {{ store.count() }}</p>
    } @else {
      <p>No store</p>
    }
  `,
})
export class CounterDisplay {
  protected readonly store = inject(CounterStore, { optional: true });
}

@Component({
  selector: 'app-counter-panel',
  imports: [CounterDisplay, CounterButton],
  providers: [CounterStore],
  template: `
    <section>
      <app-counter-display />
      <app-counter-button />
    </section>
  `,
})
export class CounterPanel {}

@Component({
  selector: 'app-root',
  imports: [CounterPanel, CounterDisplay],
  template: `
    <app-counter-panel />
    <app-counter-panel />
    <app-counter-display />
  `,
})
export class App {}
