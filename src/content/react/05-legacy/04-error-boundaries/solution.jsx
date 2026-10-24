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

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.props.onError?.(error, info.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return this.props.fallbackRender({ error: this.state.error, reset: this.reset });
    }
    return this.props.children;
  }
}

function CrashFallback({ error, reset }) {
  return (
    <div role="alert">
      <p>Something went wrong: {error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}

export default function App() {
  return (
    <main>
      <h1>Dashboard</h1>
      <ErrorBoundary fallbackRender={CrashFallback}>
        <BuggyCounter />
      </ErrorBoundary>
    </main>
  );
}
