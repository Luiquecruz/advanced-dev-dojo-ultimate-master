import { Component, forwardRef, inject } from '@angular/core';
import { LocalCounter, SharedCounter } from './counters';

@Component({
  selector: 'app-page',
  imports: [forwardRef(() => Counter)],
  template: `
    <app-counter />
    <app-counter />
  `,
})
export class Page {}

@Component({
  selector: 'app-counter',
  providers: [LocalCounter],
  template: `
    <p>Local: {{ local.count() }}</p>
    <p>Shared: {{ shared.count() }}</p>
    <button (click)="local.increment()">Local +1</button>
    <button (click)="shared.increment()">Shared +1</button>
  `,
})
export class Counter {
  protected readonly local = inject(LocalCounter);
  protected readonly shared = inject(SharedCounter);
}
