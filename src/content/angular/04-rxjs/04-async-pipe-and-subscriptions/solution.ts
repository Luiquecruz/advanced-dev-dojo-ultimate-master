import { Component, InjectionToken, inject, signal } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, interval } from 'rxjs';

export const TICKS = new InjectionToken<Observable<number>>('TICKS', {
  providedIn: 'root',
  factory: () => interval(1000),
});

@Component({
  selector: 'app-async-ticker',
  imports: [AsyncPipe],
  template: `<p>Async: {{ ticks$ | async }}</p>`,
})
export class AsyncTicker {
  protected readonly ticks$ = inject(TICKS);
}

@Component({
  selector: 'app-manual-ticker',
  template: `<p>Manual: {{ latest() }}</p>`,
})
export class ManualTicker {
  protected readonly latest = signal(0);

  constructor() {
    inject(TICKS)
      .pipe(takeUntilDestroyed())
      .subscribe((value) => this.latest.set(value));
  }
}
