import { createContext, useContext, useRef } from 'react';

export const ThemeContext = createContext('light');

export function TextInput({ label, ref, ...props }) {
  return (
    <label>
      {label}
      <input ref={ref} {...props} />
    </label>
  );
}

export function ThemedPanel({ children }) {
  const theme = useContext(ThemeContext);
  return <section data-theme={theme}>{children}</section>;
}

export default function SearchPanel({ theme = 'dark' }) {
  const inputRef = useRef(null);

  return (
    <ThemeContext value={theme}>
      <ThemedPanel>
        <TextInput label="Search" ref={inputRef} />
        <button onClick={() => inputRef.current.focus()}>Focus search</button>
      </ThemedPanel>
    </ThemeContext>
  );
}
