const countText = (container) => container.querySelector('p').textContent.replace(/\s+/g, ' ').trim();

test('Counter is a class component extending Component', () => {
  expect(typeof mod.default).toBe('function');
  expect(mod.default.prototype.isReactComponent).toBeTruthy();
  expect(source).not.toMatch(/\buse(State|Reducer)\b/);
});

test('uses static defaultProps: renders "Count: 0" without props', () => {
  const Counter = mod.default;
  const { container } = render(<Counter />);
  expect(Counter.defaultProps).toEqual({ label: 'Count', step: 1 });
  expect(countText(container)).toBe('Count: 0');
});

test('"Increment" adds the step prop to the count', async () => {
  const Counter = mod.default;
  const { container } = render(<Counter label="Points" step={5} />);
  await user.click(screen.getByRole('button', { name: 'Increment' }));
  await user.click(screen.getByRole('button', { name: 'Increment' }));
  expect(countText(container)).toBe('Points: 10');
});

test('"Increment twice" grows the count by 2 x step (updater form)', async () => {
  const Counter = mod.default;
  const { container } = render(<Counter step={3} />);
  await user.click(screen.getByRole('button', { name: 'Increment twice' }));
  expect(countText(container)).toBe('Count: 6');
});

test('"Reset" sets the count back to 0', async () => {
  const Counter = mod.default;
  const { container } = render(<Counter />);
  await user.click(screen.getByRole('button', { name: 'Increment' }));
  await user.click(screen.getByRole('button', { name: 'Reset' }));
  expect(countText(container)).toBe('Count: 0');
});
