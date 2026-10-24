import { createContext, useContext, useRef } from 'react';

export const ThemeContext = createContext('light');

export function TextInput({ label, ...props }) {
  // TODO: accept `ref` as a prop and attach it to the <input>
  return (
    <label>
      {label}
      <input {...props} />
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
    // TODO: replace ThemeContext.Provider with the React 19 syntax
    <ThemeContext.Provider value={theme}>
      <ThemedPanel>
        {/* TODO: pass inputRef to TextInput */}
        <TextInput label="Search" />
        {/* TODO: focus the input when the button is clicked */}
        <button>Focus search</button>
      </ThemedPanel>
    </ThemeContext.Provider>
  );
}
