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

  private readonly resultList = signal<string[]>([]);
  private readonly savedList = signal<string[]>([]);

  readonly results = this.resultList.asReadonly();
  readonly saved = this.savedList.asReadonly();

  constructor() {
    this.queries
      .pipe(
        debounceTime(DEBOUNCE_MS),
        distinctUntilChanged(),
        switchMap((query) => this.search(query).pipe(catchError(() => of([] as string[])))),
        takeUntilDestroyed(),
      )
      .subscribe((results) => this.resultList.set(results));

    this.saves
      .pipe(
        exhaustMap((name) => this.save(name)),
        takeUntilDestroyed(),
      )
      .subscribe((name) => this.savedList.update((list) => [...list, name]));
  }

  find(query: string) {
    this.queries.next(query);
  }

  submit(name: string) {
    this.saves.next(name);
  }
}
