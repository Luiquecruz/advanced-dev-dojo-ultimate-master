import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LegacyUsers {
  readonly users$ = new BehaviorSubject<string[]>([]);
  readonly added$ = new Subject<string>();

  add(name: string) {
    this.users$.next([...this.users$.value, name]);
    this.added$.next(name);
  }
}

@Injectable({ providedIn: 'root' })
export class UsersFacade {
  private readonly legacy = inject(LegacyUsers);

  // TODO: `users` with toSignal, `count`, `query` and `filtered`

  readonly added: string[] = [];

  constructor() {
    // TODO: record every added name, stopping when the facade is destroyed
  }

  add(name: string) {
    // TODO: delegate to the legacy service
  }
}
