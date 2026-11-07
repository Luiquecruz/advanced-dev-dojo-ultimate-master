Write an optimistic todo store. **`todos.ts`** exports the `Todo` interface `{ id: number; title: string; completed: boolean }`, the token `SAVE_TODO` (`(todo: Todo) => Promise<void>`) and `TodoStore` (`@Injectable({ providedIn: 'root' })`).

1. `todos`: a read-only signal of the list, filled by `load(todos: Todo[])`. `error`: a read-only signal, `null` at start.
2. `toggle(id: number)` flips `completed` of that todo **immediately** (before the save finishes), clears `error`, and calls `SAVE_TODO` with the updated todo. An unknown id does nothing.
3. If the save rejects, only that todo's `completed` goes back to its previous value and `error` becomes `'Could not save the change.'`. Other todos, including ones toggled meanwhile, are not touched.
4. Always replace objects and arrays; never mutate them.
