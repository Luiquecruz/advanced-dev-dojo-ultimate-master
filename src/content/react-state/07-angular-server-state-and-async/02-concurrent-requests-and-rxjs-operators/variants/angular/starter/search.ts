import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, catchError, debounceTime, distinctUntilChanged, exhaustMap, of, switchMap } from 'rxjs';

export const SEARCH = new InjectionToken<(query: string) => Observable<string[]>>('SEARCH');
export const SAVE = new InjectionToken<(name: string) => Observable<string>>('SAVE');
export const DEBOUNCE_MS = 20;

@Injectable({ providedIn: 'root' })
export class SearchStore {
  private readonly search = inject(SEARCH);
  private readonly save = inject(SAVE);

  private readonly queries = new Subject<string>();
  private readonly saves = new Subject<string>();

  // TODO: private signals plus read-only `results` and `saved`

  constructor() {
    // TODO: search pipeline: debounce, distinct, switchMap with an inner catchError
    // TODO: save pipeline: exhaustMap
  }

  find(query: string) {
    // TODO
  }

  submit(name: string) {
    // TODO
  }
}
