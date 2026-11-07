1. Keep a Subject for queries and one for saves, each fed by a method.
2. Build the search pipeline with debounce, distinct and `switchMap`, catching errors in the inner pipe.
3. Build the save pipeline with `exhaustMap`.
4. Write results and saved names into private signals exposed read-only.
5. End both pipelines with `takeUntilDestroyed()`.
