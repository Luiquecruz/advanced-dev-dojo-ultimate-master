Add `ref` to the destructured props of `TextInput` and write `<input ref={ref} {...props} />`.
---
Pass the ref down: `<TextInput label="Search" ref={inputRef} />`, then `onClick={() => inputRef.current.focus()}` on the button.
---
Swap `<ThemeContext.Provider value={theme}>...</ThemeContext.Provider>` for `<ThemeContext value={theme}>...</ThemeContext>`.
