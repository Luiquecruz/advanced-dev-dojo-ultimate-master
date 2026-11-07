Create two private `Subject<string>` fields. `find` and `submit` only call `next`. The pipelines are built once in the constructor.
---
Search: `debounceTime(DEBOUNCE_MS), distinctUntilChanged(), switchMap((query) => this.search(query).pipe(catchError(() => of([] as string[])))), takeUntilDestroyed()`.
---
Save: `exhaustMap((name) => this.save(name))`, then `subscribe((name) => this.savedList.update((list) => [...list, name]))`.
