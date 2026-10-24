`use` can be called after an early return, unlike Hooks. Start `UserGreeting` with `if (hidden) return null;`.
---
`const theme = use(ThemeContext);` and `const user = use(userPromise);` give you plain values. Pending promises suspend the component automatically.
---
Something above `UserGreeting` must catch the suspension: `<Suspense fallback={<p>Loading user...</p>}><UserGreeting ... /></Suspense>` inside the provider.
