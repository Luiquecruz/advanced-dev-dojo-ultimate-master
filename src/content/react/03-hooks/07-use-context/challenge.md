The theme is prop-drilled from `App` through `Toolbar` into every `ThemedButton`. Replace the drilling with context.

- Export `ThemeContext` created with `createContext('light')`.
- `ThemedButton({ children })` reads the theme with `useContext` (or `use`) and renders `<button className="btn btn-{theme}">`.
- `Toolbar()` renders two `ThemedButton`s, **Save** and **Cancel**, and takes no theme prop. It must work inside any `<ThemeContext value="...">`.
- `App` (default export) keeps the theme in state and provides it with `<ThemeContext value={theme}>` (React 19 syntax). The `Dark mode` checkbox switches between `light` and `dark`.

A `ThemedButton` rendered without any provider uses `btn-light`, and nested providers override outer ones.
