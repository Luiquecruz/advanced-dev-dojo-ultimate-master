1. Return `null` first when `hidden` is true, so neither resource is read and nothing suspends.
2. Read the theme with `use(ThemeContext)`; this works after the early return because `use` is not bound by the rules of Hooks.
3. Read the user with `use(userPromise)`; while pending, the component suspends.
4. Render the greeting with the combined class name.
5. In `App`, wrap `UserGreeting` in `<Suspense>` with the loading fallback.
