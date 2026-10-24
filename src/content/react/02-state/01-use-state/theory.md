## Why a local variable is not enough

```jsx
export default function Counter() {
  let count = 0;
  function handleClick() {
    count = count + 1; // changes the variable...
  }
  return <button onClick={handleClick}>Clicked {count} times</button>; // ...but the screen never updates
}
```

Two things go wrong:

1. **Local variables do not persist between renders.** Every render calls `Counter()` again, and `let count = 0` starts from zero.
2. **Changing a local variable does not trigger a render.** React has no idea anything changed.

**State** solves both: React keeps the value between renders, and updating it schedules a new render.

## `useState`

```jsx
import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>Clicked {count} times</button>;
}
```

`useState(initialValue)` returns a pair you destructure:

- `count`: the state value **for this render**.
- `setCount`: the setter. Calling it stores the next value and asks React to re-render the component.

The initial value is only used during the **first** render. Name the pair `[something, setSomething]` by convention.

## State is isolated and private

State belongs to a **component instance**, not to the function. Render `<Counter />` twice and each one has its own count. A parent cannot read a child's state; if two components need the same value, you lift it up to a common parent (a later lesson).

## Multiple state variables

Call `useState` once per independent value:

```jsx
const [name, setName] = useState('');
const [isOpen, setIsOpen] = useState(false);
const [tags, setTags] = useState([]);
```

Group values in one object only when they always change together.

## Lazy initialization

If computing the initial value is expensive, pass a **function**. React calls it only on the first render:

```jsx
const [todos, setTodos] = useState(() => loadTodosFromStorage()); // ✅ runs once
const [todos, setTodos] = useState(loadTodosFromStorage());       // ⚠️ runs every render, result ignored
```

## Hooks rules (preview)

`useState` is a **Hook**. Hooks are functions starting with `use` and must be called at the top level of a component (or custom hook): never inside conditions, loops or nested functions. React identifies each piece of state by **call order**.

## Deriving values

Do not store something you can compute from existing state or props. Compute it during render:

```jsx
const [count, setCount] = useState(0);
const isMax = count >= 10; // ✅ derived, always in sync
```

## Legacy vs modern

Class components kept all state in one object and merged updates:

```jsx
class Counter extends React.Component {
  state = { count: 0 };
  render() {
    return <button onClick={() => this.setState({ count: this.state.count + 1 })}>{this.state.count}</button>;
  }
}
```

`useState` setters **replace** the value instead of merging. With objects, copy the rest yourself (`setForm({ ...form, name })`).

## Pitfalls

- Reading state right after setting it returns the **old** value: `setCount(count + 1); console.log(count);` logs the previous count. More on this in the next lesson.
- Setting the same value (`Object.is` equal) skips the re-render.
- Calling a setter during render (outside a condition) causes an infinite loop: "Too many re-renders".
