import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-counter',
  template: `
    <p>Count: {{ count() }}</p>
    <button (click)="increment()">Increment</button>
    @if (count() >= 3) {
      <strong>Nice!</strong>
    }
  `,
})
export class Counter {
  protected readonly count = signal(0);

  increment() {
    this.count.update((value) => value + 1);
  }
}
