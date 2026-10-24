import { createContext, Suspense, use } from 'react';

export const ThemeContext = createContext('light');

export function UserGreeting({ userPromise, hidden }) {
  // TODO: return null early when hidden
  // TODO: read the theme with use(ThemeContext) and the user with use(userPromise)
  return <h2 className="greeting">Hello!</h2>;
}

export default function App({ userPromise, theme = 'light', hidden = false }) {
  return (
    <ThemeContext value={theme}>
      {/* TODO: wrap UserGreeting in <Suspense> with the fallback <p>Loading user...</p> */}
      <UserGreeting userPromise={userPromise} hidden={hidden} />
    </ThemeContext>
  );
}
