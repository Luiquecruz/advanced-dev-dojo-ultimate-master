Chain the operators in order inside `queries$.pipe(...)`: `debounceTime(debounceMs)`, `map((query) => query.trim())`, `distinctUntilChanged()`.
---
The last step decides between "no search" and "search": `switchMap((query) => query.length < 2 ? of([]) : search(query))`.
---
In the template, use the template reference variable: `<input #box ... (input)="queries.next(box.value)" />`.
