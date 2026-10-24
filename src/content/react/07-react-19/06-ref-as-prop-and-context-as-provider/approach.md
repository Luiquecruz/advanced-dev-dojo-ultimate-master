1. Destructure `ref` in `TextInput` and attach it to the `<input>`; React 19 no longer strips `ref` from props.
2. Create `inputRef` with `useRef(null)` in `SearchPanel` and pass it as `ref` to `TextInput`.
3. Focus the input in the button's click handler through `inputRef.current`.
4. Replace the legacy `.Provider` with `<ThemeContext value={theme}>`; consumers stay unchanged.
