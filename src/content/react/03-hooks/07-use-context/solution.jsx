import { createContext, useContext, useState } from 'react';

export const ThemeContext = createContext('light');

export function ThemedButton({ children }) {
  const theme = useContext(ThemeContext);
  return <button className={`btn btn-${theme}`}>{children}</button>;
}

export function Toolbar() {
  return (
    <div>
      <ThemedButton>Save</ThemedButton>
      <ThemedButton>Cancel</ThemedButton>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState('light');

  return (
    <ThemeContext value={theme}>
      <Toolbar />
      <label>
        <input
          type="checkbox"
          checked={theme === 'dark'}
          onChange={(event) => setTheme(event.target.checked ? 'dark' : 'light')}
        />
        Dark mode
      </label>
    </ThemeContext>
  );
}
