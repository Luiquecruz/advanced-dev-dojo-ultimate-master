Type a small todo app: state, ref, events and a reducer.

1. Export **`type Todo = { id: number; title: string; done: boolean }`** (type or interface).
2. Export a discriminated union **`Action`** with exactly these members:
   - `{ type: 'added'; title: string }`
   - `{ type: 'toggled'; id: number }`
   - `{ type: 'cleared' }`
3. **`export function todosReducer(state: Todo[], action: Action): Todo[]`**:
   - `added` appends `{ id: <highest id + 1, or 1 when empty>, title, done: false }`,
   - `toggled` flips `done` of the matching todo,
   - `cleared` removes the completed todos,
   - a `default` branch assigns `action` to a variable of type **`never`** (exhaustiveness check).
4. **`export default function TodoApp()`**:
   - `useReducer(todosReducer, [])` and `useState` for the input text,
   - **`useRef<HTMLInputElement>(null)`** on the input,
   - a `<form aria-label="Add todo">` with `<input aria-label="Title">` and a `<button>` **`Add`**; the change handler is typed with **`ChangeEvent<HTMLInputElement>`** and the submit handler with **`SubmitEvent<HTMLFormElement>`** (or the older `FormEvent<HTMLFormElement>`),
   - submitting a non-empty trimmed title dispatches `added`, clears the input and focuses it through the ref,
   - a `<ul>` with one `<li>` per todo containing `<label><input type="checkbox" checked={todo.done} /> {todo.title}</label>` that dispatches `toggled`,
   - a `<button>` **`Clear completed`** that dispatches `cleared`.
