Destructure `const [isPending, startTransition] = useTransition();` and use `isPending` for both the `disabled` attribute and the button text.
---
Inside `handleSave`, call `startTransition(async () => { ... })` and `await fetch(...)` inside it. Send `method: 'PATCH'`, the JSON header and `body: JSON.stringify({ title })`.
---
`fetch` does not reject on a `500`: check `if (!response.ok)`, set the error and `return`. Otherwise `await response.json()` and store `todo.title`. Wrap the `setState` calls that come after `await` in another `startTransition(() => { ... })`.
