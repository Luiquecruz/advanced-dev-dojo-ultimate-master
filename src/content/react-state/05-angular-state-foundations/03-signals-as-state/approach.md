1. Hold the list and the category in private signals and expose read-only views.
2. Derive `filtered` from both with `computed`.
3. Create `page` as a `linkedSignal` that depends on the category and returns 1.
4. Derive `pageCount` from the filtered length and `pageSize`.
5. Derive `visible` by slicing the filtered list for the current page.
