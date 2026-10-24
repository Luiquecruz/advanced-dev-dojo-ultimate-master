Write a custom Hook `useLocalStorage(key, initialValue)` (named export) that works like `useState` but remembers its value in `localStorage`.

- Returns `[value, setValue]`.
- On the first render, read `localStorage.getItem(key)`: if it is `null`, use `initialValue`; otherwise use the stored string parsed with `JSON.parse`. Read storage only once (lazy initial state).
- `setValue` accepts a value **or** an updater function, exactly like `useState`.
- Whenever the value (or key) changes, save it with `localStorage.setItem(key, JSON.stringify(value))`.

The default `App` uses the Hook twice (`dojo:name` and `dojo:visits`). Each call keeps its own value under its own key.
