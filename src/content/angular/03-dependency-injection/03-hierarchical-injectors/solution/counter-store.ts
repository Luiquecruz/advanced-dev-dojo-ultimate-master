import { Injectable, signal } from '@angular/core';

@Injectable()
export class CounterStore {
  readonly count = signal(0);

  increment() {
    this.count.update((value) => value + 1);
  }
}
