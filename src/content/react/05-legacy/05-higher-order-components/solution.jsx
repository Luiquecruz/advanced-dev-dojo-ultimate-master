import { createContext, useContext } from 'react';

export const UserContext = createContext({ name: 'Guest' });

export function GreetingView({ currentUser }) {
  return <h2>Hello, {currentUser.name}</h2>;
}

const getDisplayName = (WrappedComponent) => WrappedComponent.displayName || WrappedComponent.name || 'Component';

export function withLoading(WrappedComponent) {
  function WithLoading({ isLoading, ...props }) {
    if (isLoading) {
      return <p role="status">Loading...</p>;
    }
    return <WrappedComponent {...props} />;
  }
  WithLoading.displayName = `WithLoading(${getDisplayName(WrappedComponent)})`;
  return WithLoading;
}

export function withCurrentUser(WrappedComponent) {
  function WithCurrentUser(props) {
    const currentUser = useContext(UserContext);
    return <WrappedComponent currentUser={currentUser} {...props} />;
  }
  WithCurrentUser.displayName = `WithCurrentUser(${getDisplayName(WrappedComponent)})`;
  return WithCurrentUser;
}

export const Greeting = withCurrentUser(withLoading(GreetingView));

export default function App() {
  return (
    <UserContext value={{ name: 'Ada Lovelace' }}>
      <Greeting isLoading={false} />
    </UserContext>
  );
}
