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

  readonly users = toSignal(this.legacy.users$, { requireSync: true });
  readonly count = computed(() => this.users().length);
  readonly query = signal('');
  readonly filtered = computed(() => {
    const text = this.query().toLowerCase();
    return this.users().filter((name) => name.toLowerCase().includes(text));
  });

  readonly added: string[] = [];

  constructor() {
    this.legacy.added$.pipe(takeUntilDestroyed()).subscribe((name) => this.added.push(name));
  }

  add(name: string) {
    this.legacy.add(name);
  }
}
