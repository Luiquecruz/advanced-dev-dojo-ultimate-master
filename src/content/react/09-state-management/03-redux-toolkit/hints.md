Immer lets you mutate the draft inside a case reducer: `state.items.push(action.payload)` is fine. For `completedCleared`, assign a new array: `state.items = state.items.filter(...)`.
---
A case reducer with a prepare callback is an object instead of a function: `todoAdded: { reducer(state, action) { ... }, prepare(title) { return { payload: { ... } }; } }`.
---
Slice selectors receive the slice state (`{ items }`), not the root state. `selectRemainingCount: (state) => state.items.filter((todo) => !todo.completed).length`.
---
In `TodoApp`: `const todos = useSelector(selectTodos);`, `const dispatch = useDispatch();`, then `onChange={() => dispatch(todoToggled(todo.id))}`. In `App`, create `const store = makeStore();` at module level and wrap with `<Provider store={store}>`.
