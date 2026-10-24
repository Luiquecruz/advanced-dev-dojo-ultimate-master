import { useState } from 'react';

// TODO: create the context with createContext('light')
export const ThemeContext = null;

// TODO: read the theme from ThemeContext instead of a prop
export function ThemedButton({ theme = 'light', children }) {
  return <button className={`btn btn-${theme}`}>{children}</button>;
}

// TODO: Toolbar should not receive or forward a theme prop
export function Toolbar({ theme }) {
  return (
    <div>
      <ThemedButton theme={theme}>Save</ThemedButton>
      <ThemedButton theme={theme}>Cancel</ThemedButton>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState('light');

  return (
    <>
      {/* TODO: wrap the tree in <ThemeContext value={theme}> and stop passing the prop */}
      <Toolbar theme={theme} />
      <label>
        <input
          type="checkbox"
          checked={theme === 'dark'}
          onChange={(event) => setTheme(event.target.checked ? 'dark' : 'light')}
        />
        Dark mode
      </label>
    </>
  );
}
