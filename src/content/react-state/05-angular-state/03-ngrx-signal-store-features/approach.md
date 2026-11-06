1. Add `withEntities<Todo>()` before `withState` to get a normalized todo collection.
2. Derive `remainingCount` and `visibleTodos` from `entities` and `filter` in `withComputed`.
3. In `withMethods`, inject `HttpClient` and write `load` as an async method that patches `loading` around the request.
4. Use entity updaters (`setAllEntities`, `updateEntity`, `removeEntity`) inside `patchState` instead of editing arrays by hand.
5. Add `withHooks` and call `store.load()` in `onInit` so the data arrives as soon as the store is injected.
