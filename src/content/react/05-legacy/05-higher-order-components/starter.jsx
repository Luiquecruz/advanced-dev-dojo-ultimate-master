import { createContext, useContext } from 'react';

export const UserContext = createContext({ name: 'Guest' });

export function GreetingView({ currentUser }) {
  return <h2>Hello, {currentUser.name}</h2>;
}

export function withLoading(WrappedComponent) {
  // TODO: return a component that shows <p role="status">Loading...</p> when isLoading is truthy
  // TODO: otherwise render WrappedComponent with the remaining props
  // TODO: set displayName to `WithLoading(${name})`
  return WrappedComponent;
}

export function withCurrentUser(WrappedComponent) {
  // TODO: read UserContext and inject it as the currentUser prop (explicit props win)
  // TODO: set displayName to `WithCurrentUser(${name})`
  return WrappedComponent;
}

// TODO: compose withCurrentUser(withLoading(GreetingView))
export const Greeting = GreetingView;

export default function App() {
  return (
    <UserContext value={{ name: 'Ada Lovelace' }}>
      <Greeting isLoading={false} />
    </UserContext>
  );
}
