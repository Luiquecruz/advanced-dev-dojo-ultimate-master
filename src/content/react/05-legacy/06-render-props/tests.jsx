test('useToggle returns { on, toggle } and toggle flips the value', () => {
  const { result } = renderHook(() => mod.useToggle());
  expect(result.current.on).toBe(false);
  act(() => result.current.toggle());
  expect(result.current.on).toBe(true);
  act(() => result.current.toggle());
  expect(result.current.on).toBe(false);
});

test('Toggle calls its children function with { on, toggle }', async () => {
  const { Toggle } = mod;
  render(<Toggle>{({ on, toggle }) => <button onClick={toggle}>{on ? 'ON' : 'OFF'}</button>}</Toggle>);
  const button = screen.getByRole('button');
  expect(button).toHaveTextContent('OFF');
  await user.click(button);
  expect(button).toHaveTextContent('ON');
});

test('Toggle honors initialOn', () => {
  const { Toggle } = mod;
  render(<Toggle initialOn>{({ on }) => <span>{on ? 'ON' : 'OFF'}</span>}</Toggle>);
  expect(screen.getByText('ON')).toBeInTheDocument();
});

test('MouseTracker passes the pointer position to its render prop', () => {
  const { MouseTracker } = mod;
  const renderProp = fn(({ x, y }) => (
    <p>
      {x},{y}
    </p>
  ));
  render(<MouseTracker render={renderProp} />);
  expect(renderProp).toHaveBeenLastCalledWith({ x: 0, y: 0 });
  fireEvent.mouseMove(screen.getByTestId('tracker'), { clientX: 42, clientY: 17 });
  expect(renderProp).toHaveBeenLastCalledWith({ x: 42, y: 17 });
  expect(screen.getByTestId('tracker')).toHaveTextContent('42,17');
});

test('App toggles the details with "Show details" / "Hide details"', async () => {
  const App = mod.default;
  render(<App />);
  expect(screen.queryByText('Render props share logic.')).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Show details' }));
  expect(screen.getByText('Render props share logic.')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Hide details' }));
  expect(screen.queryByText('Render props share logic.')).toBeNull();
});
