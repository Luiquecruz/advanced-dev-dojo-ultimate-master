Modernize a search panel using React 19 APIs.

1. Export `TextInput({ label, ref, ...props })`: a **plain function component** (no `forwardRef`) that renders a `<label>` containing the `label` text and an `<input>`. The `ref` prop and the remaining props go to the `<input>`.
2. Export `ThemeContext = createContext('light')` (already in the starter) and `ThemedPanel({ children })`, which reads the theme from the context and renders `<section data-theme={theme}>{children}</section>`.
3. The default export `SearchPanel({ theme = 'dark' })`:
   - Provides `theme` by rendering `<ThemeContext value={theme}>` (not `ThemeContext.Provider`).
   - Inside, renders `ThemedPanel` with a `TextInput` labelled `Search` (attached to a ref created with `useRef`) and a `<button>` with the text `Focus search`.
   - Clicking the button focuses the search input through the ref.
