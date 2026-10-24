import { Component, useState } from 'react';

export function BuggyCounter() {
  const [count, setCount] = useState(0);
  if (count === 3) {
    throw new Error('Counter crashed');
  }
  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>;
}

export class ErrorBoundary extends Component {
  state = { error: null };

  // TODO: implement static getDerivedStateFromError(error) and return { error }

  // TODO: implement componentDidCatch(error, info) and call this.props.onError with (error, info.componentStack)

  // TODO: add a reset method that clears the error

  render() {
    // TODO: when there is an error, return this.props.fallbackRender({ error, reset })
    return this.props.children;
  }
}

export default function App() {
  return (
    <main>
      <h1>Dashboard</h1>
      {/* TODO: wrap BuggyCounter in an ErrorBoundary with a fallbackRender */}
      <BuggyCounter />
    </main>
  );
}
