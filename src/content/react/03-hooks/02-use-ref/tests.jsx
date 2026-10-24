const seconds = () => parseFloat(screen.getByRole('timer').textContent);

test('starts at 0.0s and counts up after clicking Start', async () => {
  const Stopwatch = mod.default;
  render(<Stopwatch />);
  expect(screen.getByRole('timer')).toHaveTextContent('0.0s');
  fireEvent.click(screen.getByRole('button', { name: 'Start' }));
  await act(() => sleep(350));
  expect(seconds()).toBeGreaterThan(0);
});

test('Stop freezes the time', async () => {
  const Stopwatch = mod.default;
  render(<Stopwatch />);
  fireEvent.click(screen.getByRole('button', { name: 'Start' }));
  await act(() => sleep(250));
  fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
  const frozen = screen.getByRole('timer').textContent;
  await act(() => sleep(300));
  expect(screen.getByRole('timer')).toHaveTextContent(frozen);
});

test('clicking Start twice does not create a second interval', async () => {
  const Stopwatch = mod.default;
  render(<Stopwatch />);
  fireEvent.click(screen.getByRole('button', { name: 'Start' }));
  fireEvent.click(screen.getByRole('button', { name: 'Start' }));
  await act(() => sleep(520));
  fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
  expect(seconds()).toBeLessThanOrEqual(0.7);
  await act(() => sleep(250));
  expect(seconds()).toBeLessThanOrEqual(0.7);
});

test('Reset stops the stopwatch and shows 0.0s', async () => {
  const Stopwatch = mod.default;
  render(<Stopwatch />);
  fireEvent.click(screen.getByRole('button', { name: 'Start' }));
  await act(() => sleep(250));
  fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
  await act(() => sleep(250));
  expect(screen.getByRole('timer')).toHaveTextContent('0.0s');
});

test('clears the interval on unmount', async () => {
  const Stopwatch = mod.default;
  const original = globalThis.clearInterval;
  const spy = fn((id) => original(id));
  globalThis.clearInterval = spy;
  try {
    const { unmount } = render(<Stopwatch />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    unmount();
    expect(spy.mock.calls.some(([id]) => id !== null && id !== undefined)).toBe(true);
  } finally {
    globalThis.clearInterval = original;
  }
});

test('stores the interval id with useRef', () => {
  expect(source).toMatch(/useRef\s*\(/);
});
