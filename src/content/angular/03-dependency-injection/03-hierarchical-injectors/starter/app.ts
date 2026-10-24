import { Component, inject } from '@angular/core';
import { CounterStore } from './counter-store';

@Component({
  selector: 'app-counter-button',
  template: `
    <!-- TODO: +1 button -->
  `,
})
export class CounterButton {
  // TODO: inject CounterStore
}

@Component({
  selector: 'app-counter-display',
  template: `
    <!-- TODO: "Count: N" or "No store" -->
  `,
})
export class CounterDisplay {
  // TODO: inject CounterStore optionally
}

@Component({
  selector: 'app-counter-panel',
  imports: [CounterDisplay, CounterButton],
  // TODO: provide CounterStore here
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
    <!-- TODO: two panels and one display outside the panels -->
  `,
})
export class App {}
