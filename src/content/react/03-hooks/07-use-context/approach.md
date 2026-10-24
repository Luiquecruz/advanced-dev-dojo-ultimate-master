1. Create `ThemeContext` with `createContext('light')`; the default covers components rendered without a provider.
2. In `ThemedButton`, drop the `theme` prop and read it with `useContext(ThemeContext)`.
3. Simplify `Toolbar` so it neither receives nor forwards the theme.
4. In `App`, wrap the tree in `<ThemeContext value={theme}>`. Every descendant reading the context now gets the state value.
5. When the checkbox changes the state, the provider's value changes and React re-renders every consumer.
