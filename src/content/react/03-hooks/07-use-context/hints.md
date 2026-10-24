Context has three parts: create it once at module level, provide a value high in the tree, read it where it is needed.
---
`export const ThemeContext = createContext('light');` and inside `ThemedButton`: `const theme = useContext(ThemeContext);`. Remove the `theme` props from `ThemedButton` and `Toolbar`.
---
In `App`, replace the fragment with `<ThemeContext value={theme}> ... </ThemeContext>` and render `<Toolbar />` with no props.
