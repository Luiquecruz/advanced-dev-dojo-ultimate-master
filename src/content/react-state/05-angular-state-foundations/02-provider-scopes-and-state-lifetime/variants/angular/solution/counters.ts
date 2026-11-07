import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SharedCounter {
  private readonly state = signal(0);
  readonly count = this.state.asReadonly();

  increment() {
    this.state.update((value) => value + 1);
  }
}

@Injectable()
export class LocalCounter {
  private readonly state = signal(0);
  readonly count = this.state.asReadonly();

  increment() {
    this.state.update((value) => value + 1);
  }
}
