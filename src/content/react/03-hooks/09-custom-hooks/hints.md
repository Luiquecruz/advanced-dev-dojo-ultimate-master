You do not need to reinvent state: build on `useState` and `useEffect`. The custom Hook is a function that calls them and returns the pair.
---
Pass a function to `useState` so storage is read only on the first render: `useState(() => { const stored = localStorage.getItem(key); return stored === null ? initialValue : JSON.parse(stored); })`.
---
Returning the `setValue` from `useState` gives you functional updates for free. Persist with `useEffect(() => { localStorage.setItem(key, JSON.stringify(value)); }, [key, value]);`.
