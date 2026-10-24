## Treat state as read-only

State can hold objects and arrays, but React only re-renders when you call the setter with a **new value**. It compares the old and new values with `Object.is`: if you mutate an object and pass the same reference back, React sees "nothing changed" and skips the render.

```jsx
const [position, setPosition] = useState({ x: 0, y: 0 });

position.x = 10;           // 🔴 mutation: no re-render, and past renders now see x = 10
setPosition(position);     // 🔴 same reference: bail out

setPosition({ ...position, x: 10 }); // ✅ new object
```

Mutation also breaks features that rely on comparing old and new values: `memo`, `useMemo` dependencies, undo history and DevTools time travel. Rule: **copy, then change the copy**.

## Updating objects

The spread syntax copies properties into a new object; later properties win:

```jsx
setPerson({ ...person, email: 'ada@example.com' });
```

Spread is **shallow**. For nested objects, copy every level on the path to the change:

```jsx
const [person, setPerson] = useState({
  name: 'Ada',
  address: { city: 'London', country: 'UK' },
});

setPerson({
  ...person,
  address: { ...person.address, city: 'Paris' },
});
```

A single handler for many fields can use a computed key: `setForm({ ...form, [event.target.name]: event.target.value })`.

## Updating arrays

Prefer methods that **return a new array** over methods that mutate:

| Goal | Avoid (mutates) | Prefer (returns new array) |
| --- | --- | --- |
| Add | `push`, `unshift` | `[...items, item]`, `[item, ...items]` |
| Remove | `splice`, `pop`, `shift` | `filter` |
| Replace / update | `items[i] = x` | `map` |
| Insert at index | `splice` | `[...items.slice(0, i), x, ...items.slice(i)]` or `toSpliced` |
| Sort / reverse | `sort`, `reverse` | `toSorted`, `toReversed`, or copy first `[...items].sort()` |

```jsx
// add
setTodos([...todos, { id: nextId, title, completed: false }]);

// remove
setTodos(todos.filter((todo) => todo.id !== id));

// update one item: copy the array AND the changed object
setTodos(todos.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)));
```

The last example shows the most common bug: copying the array but **mutating the object inside it**. `[...todos]` creates a new array that still points at the *same* todo objects, so `copy[0].completed = true` mutates the original too.

ES2023 added non-mutating array methods (`toSorted`, `toReversed`, `toSpliced`, `with`) that are perfect for state updates.

## Updater functions with collections

When several updates can happen before a re-render, use the updater form so you build on the latest array:

```jsx
setTodos((previous) => [...previous, newTodo]);
```

## Immer: mutable syntax, immutable result

For deeply nested state, the **Immer** library (and the `use-immer` hook) lets you write mutating code against a draft and produces a new immutable value. Redux Toolkit uses Immer internally. It is a convenience, not a requirement.

```jsx
updatePerson((draft) => {
  draft.address.city = 'Paris';
});
```

## Legacy note

Class components' `this.setState({ field })` **merged** the top level of the state object for you. `useState` replaces the whole value, so remember to spread the existing fields.

## Pitfalls

- `const copy = todos; copy.push(x)` is not a copy; it is the same array.
- `sort()` and `reverse()` mutate in place. Copy first or use `toSorted()`.
- Mutating props or initial data passed to `useState` corrupts the parent's data too.
