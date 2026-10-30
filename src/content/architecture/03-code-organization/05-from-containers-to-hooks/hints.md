Split the class along its two roles: everything in `state` and `componentDidMount` goes to the hook, everything in `render()` goes to the view. The filter line is derived data, so it moves to the hook's body, not to an effect.
---
In the hook, `this.state` becomes three `useState` calls (`status`, the loaded users, `query`), `componentDidMount` becomes `useEffect(() => { ... }, [])`, and `this.unmounted` becomes a local `let active = true` flipped in the effect cleanup.
---
The view is the old `render()` with `this.state.x` replaced by props and `this.setState({ query: value })` replaced by `onQueryChange(value)`. `App` becomes two lines: `const { status, users, query, setQuery } = useUserDirectory();` and the `<UserDirectory ... onQueryChange={setQuery} />` element.
