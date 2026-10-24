## Let inference do most of the work

Hooks are generic functions, and TypeScript infers their type parameter from the initial value:

```tsx
const [count, setCount] = useState(0);
const [query, setQuery] = useState('');
```

`count` is `number` and `setCount('1')` is an error. Add an explicit type argument only when the initial value does not describe every possible value.

## useState with null, unions and objects

The classic case is "nothing yet":

```tsx
type User = { id: number; name: string };

const [user, setUser] = useState<User | null>(null);
```

Without `<User | null>`, TypeScript infers `null` and `setUser(data)` fails. The same applies to empty arrays: `useState<Todo[]>([])`, otherwise you get `never[]`.

The setter's type is `Dispatch<SetStateAction<User | null>>`, which you need when passing a setter as a prop.

## useRef: DOM refs vs mutable values

```tsx
const inputRef = useRef<HTMLInputElement>(null);
inputRef.current?.focus();

const timerRef = useRef<number | undefined>(undefined);
timerRef.current = window.setTimeout(tick, 1000);
```

- A DOM ref starts as `null` and holds the element type (`HTMLInputElement`, `HTMLDivElement`, `HTMLButtonElement`...). React fills it; you read it with optional chaining.
- A value ref holds anything you assign.

React 19 types made `useRef` require an argument and made every `RefObject` mutable (`MutableRefObject` is deprecated). Older code with `useRef<HTMLInputElement>()` must now pass `null`.

## Event types

React wraps native events in typed synthetic events. The generic parameter is the element the handler is attached to:

```tsx
function handleChange(event: ChangeEvent<HTMLInputElement>) {
  setQuery(event.target.value);
}

function handleClick(event: MouseEvent<HTMLButtonElement>) {}
function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {}
```

Import them from `react` (`import type { ChangeEvent } from 'react'`) so they are not confused with the DOM's global `MouseEvent`.

For form submission, the latest `@types/react` (19.2+) deprecates `FormEvent` (it does not correspond to a real DOM event) in favor of **`SubmitEvent`**:

```tsx
function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
  event.preventDefault();
}
```

You will meet `FormEvent<HTMLFormElement>` in most existing code; it still compiles, with a deprecation hint.

**Tip:** you rarely need to write these types. Inline handlers are inferred from the JSX attribute: `onChange={(event) => setQuery(event.target.value)}`. When you extract the handler, hover the attribute in your editor to see the expected type, or use the handler aliases: `ChangeEventHandler<HTMLInputElement>`.

## useReducer with discriminated unions

Describe every action as a member of a union with a literal `type`. TypeScript narrows the action inside each `case`:

```tsx
type Action =
  | { type: 'added'; title: string }
  | { type: 'toggled'; id: number }
  | { type: 'cleared' };

function todosReducer(state: Todo[], action: Action): Todo[] {
  switch (action.type) {
    case 'added':
      return [...state, { id: state.length + 1, title: action.title, done: false }];
    case 'toggled':
      return state.map((todo) => (todo.id === action.id ? { ...todo, done: !todo.done } : todo));
    case 'cleared':
      return state.filter((todo) => !todo.done);
    default: {
      const unreachable: never = action;
      return unreachable;
    }
  }
}
```

`action.title` is only accessible in the `'added'` case. The `never` assignment in `default` makes the compiler fail if someone adds a new action type and forgets to handle it (**exhaustiveness check**). `dispatch({ type: 'added' })` without `title` is a type error too.

`useReducer(todosReducer, [])` infers the state and action types from the reducer. React 19 types changed `useReducer`'s generics; annotate the reducer, not the hook call.

## Other hooks

- `useContext`: type the context at creation, `createContext<Theme | null>(null)`, and wrap it in a hook that throws when `null`.
- `useMemo` / `useCallback`: inferred from the return value / function.
- Custom hooks returning tuples: add `as const` (`return [value, toggle] as const`) or an explicit tuple return type, otherwise you get `(boolean | (() => void))[]`.

## Pitfalls

- `useState([])` gives `never[]`: add the element type.
- `useRef<HTMLInputElement>(null!)` (non-null assertion) hides real `null` cases. Prefer `?.`.
- `event: any` in handlers loses autocompletion for `event.target.value`.
- `event.target` vs `event.currentTarget`: `currentTarget` is always the element the handler is attached to, which is what the generic types.
