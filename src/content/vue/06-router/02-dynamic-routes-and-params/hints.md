A param accepts a custom regex in parentheses right after its name. Remember the backslash must be escaped inside a JavaScript string: `'/users/:id(\\d+)'`.
---
With `props: true`, the router passes `route.params` as props. Declare it with `defineProps<{ id: string }>()`; params are always strings.
---
`watch(() => props.id, load, { immediate: true })` runs once right away and again whenever the id changes, which covers both the first visit and component reuse.
