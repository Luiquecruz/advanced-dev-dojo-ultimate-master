const quietly = async (run) => {
  const original = console.error;
  console.error = () => {};
  try {
    await run();
  } finally {
    console.error = original;
  }
};

const Fallback = ({ error, reset }) => (
  <div role="alert">
    <span>{error.message}</span>
    <button onClick={reset}>Retry</button>
  </div>
);

test('renders its children when nothing throws', () => {
  const { ErrorBoundary } = mod;
  render(
    <ErrorBoundary fallbackRender={Fallback}>
      <p>All good</p>
    </ErrorBoundary>,
  );
  expect(screen.getByText('All good')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).toBeNull();
});

test('renders fallbackRender with the error when a child throws while rendering', () =>
  quietly(() => {
    const { ErrorBoundary } = mod;
    expect(typeof ErrorBoundary.getDerivedStateFromError).toBe('function');
    const Bomb = () => {
      throw new Error('Boom');
    };
    render(
      <ErrorBoundary fallbackRender={Fallback}>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Boom');
  }));

test('componentDidCatch calls onError with the error and the component stack', () =>
  quietly(() => {
    const { ErrorBoundary } = mod;
    const onError = fn();
    const Bomb = () => {
      throw new Error('Logged');
    };
    render(
      <ErrorBoundary fallbackRender={Fallback} onError={onError}>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(onError).toHaveBeenCalledTimes(1);
    const [error, componentStack] = onError.mock.calls[0];
    expect(error.message).toBe('Logged');
    expect(typeof componentStack).toBe('string');
  }));

test('reset clears the error and renders the children again', () =>
  quietly(async () => {
    const { ErrorBoundary } = mod;
    let shouldThrow = true;
    const Flaky = () => {
      if (shouldThrow) throw new Error('Flaky');
      return <p>Recovered</p>;
    };
    render(
      <ErrorBoundary fallbackRender={Fallback}>
        <Flaky />
      </ErrorBoundary>,
    );
    shouldThrow = false;
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(screen.getByText('Recovered')).toBeInTheDocument();
  }));

test('App isolates the crash: the heading stays and "Try again" restores the counter', () =>
  quietly(async () => {
    const App = mod.default;
    render(<App />);
    const counter = screen.getByRole('button', { name: /Count/ });
    await user.click(counter);
    await user.click(counter);
    await user.click(counter);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dashboard');
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong: Counter crashed');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByRole('button', { name: 'Count: 0' })).toBeInTheDocument();
  }));
