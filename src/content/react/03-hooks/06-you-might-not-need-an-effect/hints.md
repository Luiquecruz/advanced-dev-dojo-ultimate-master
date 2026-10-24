Ask "can this be calculated from props and state?" for `visible`. If yes, it is a plain `const`, not state.
---
`const visible = products.filter((product) => product.name.toLowerCase().includes(query.toLowerCase()));` placed in the component body replaces both the state and the first Effect.
---
Write `function handleChange(event) { setQuery(event.target.value); onSearch(event.target.value); }` and pass it to `onChange`. Then remove the `useEffect` import.
