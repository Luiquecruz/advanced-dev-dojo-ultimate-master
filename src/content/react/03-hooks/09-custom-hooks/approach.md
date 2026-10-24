1. Start from `useState`, since the Hook must behave like it, including functional updates.
2. Use the lazy initializer form to read and parse `localStorage` once, falling back to `initialValue` when the key is missing.
3. Add an Effect that writes the JSON string whenever `key` or `value` changes. Writing in an Effect keeps the setter identical to React's.
4. Return `[value, setValue]` so callers can destructure it like `useState`.
5. Each call creates its own `useState` and `useEffect`, so two calls with different keys never share state.
