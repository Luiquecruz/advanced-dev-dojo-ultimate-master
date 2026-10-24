Read a Promise and a Context with `use`.

1. Export `ThemeContext = createContext('light')` (already in the starter).
2. Export `UserGreeting({ userPromise, hidden })`:
   - If `hidden` is true, return `null` **before** reading anything.
   - Otherwise read the theme with `use(ThemeContext)` and the user with `use(userPromise)`.
   - Render `<h2 className={'greeting ' + theme}>Hello, {user.name}!</h2>`.
3. The default export `App({ userPromise, theme = 'light', hidden = false })` provides `theme` through `ThemeContext` and renders `UserGreeting` inside a `<Suspense>` with the fallback `<p>Loading user...</p>`.

Do not call `useContext` and do not create the Promise inside the component: it arrives as a prop.
