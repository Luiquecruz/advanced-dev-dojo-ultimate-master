import { createContext, Suspense, use } from 'react';

export const ThemeContext = createContext('light');

export function UserGreeting({ userPromise, hidden }) {
  if (hidden) {
    return null;
  }
  const theme = use(ThemeContext);
  const user = use(userPromise);
  return <h2 className={'greeting ' + theme}>Hello, {user.name}!</h2>;
}

export default function App({ userPromise, theme = 'light', hidden = false }) {
  return (
    <ThemeContext value={theme}>
      <Suspense fallback={<p>Loading user...</p>}>
        <UserGreeting userPromise={userPromise} hidden={hidden} />
      </Suspense>
    </ThemeContext>
  );
}
