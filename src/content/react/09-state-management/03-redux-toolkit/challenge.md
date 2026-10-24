Build a todo list with **Redux Toolkit**: a slice, a store factory and React bindings.

**`todosSlice.js`** — `createSlice` named `todos` with `initialState: { items: [] }`:

- `todoAdded(title)`: uses a `prepare` callback that returns `{ payload: { id: nanoid(), title, completed: false } }`; the case reducer pushes the payload into `items`.
- `todoToggled(id)`: flips `completed` of the todo with that `id`.
- `completedCleared()`: removes every completed todo.
- `selectors`: `selectTodos` (returns `items`) and `selectRemainingCount` (number of todos that are not completed).
- Export the actions and the selectors (already destructured at the bottom of the file).

**`store.js`** — export `makeStore()` returning `configureStore({ reducer: { todos: todosSlice.reducer } })`. Do not use the legacy `createStore`.

**`App.jsx`**

- `TodoApp` (named export) uses `useSelector` and `useDispatch`:
  - a form with an input labelled `New todo` and an `Add` submit button; submitting dispatches `todoAdded` with the trimmed title (ignore empty titles) and clears the input;
  - one checkbox per todo, labelled with the todo title, checked when completed, dispatching `todoToggled(todo.id)` on change;
  - `<p data-testid="remaining">{count} remaining</p>`;
  - a `Clear completed` button dispatching `completedCleared()`.
- The default export `App` creates a store with `makeStore()` and renders `TodoApp` inside `<Provider store={store}>`.
