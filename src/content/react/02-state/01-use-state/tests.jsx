const countText = (container) => container.querySelector('p').textContent.replace(/\s+/g, ' ').trim();

test('starts at "Count: 0"', () => {
  const Counter = mod.default;
  const { container } = render(<Counter />);
  expect(countText(container)).toBe('Count: 0');
});

test('increments when "+1" is clicked', async () => {
  const Counter = mod.default;
  const { container } = render(<Counter />);
  await user.click(screen.getByRole('button', { name: '+1' }));
  await user.click(screen.getByRole('button', { name: '+1' }));
  expect(countText(container)).toBe('Count: 2');
});

test('decrements with "-1" and disables it at 0', async () => {
  const Counter = mod.default;
  const { container } = render(<Counter />);
  const decrement = screen.getByRole('button', { name: '-1' });
  expect(decrement).toBeDisabled();
  await user.click(screen.getByRole('button', { name: '+1' }));
  expect(decrement).toBeEnabled();
  await user.click(decrement);
  expect(countText(container)).toBe('Count: 0');
  expect(decrement).toBeDisabled();
});

test('"Reset" sets the count back to 0', async () => {
  const Counter = mod.default;
  const { container } = render(<Counter />);
  await user.click(screen.getByRole('button', { name: '+1' }));
  await user.click(screen.getByRole('button', { name: '+1' }));
  await user.click(screen.getByRole('button', { name: 'Reset' }));
  expect(countText(container)).toBe('Count: 0');
});

test('two counters keep independent state', async () => {
  const Counter = mod.default;
  const { container } = render(
    <>
      <Counter />
      <Counter />
    </>
  );
  await user.click(screen.getAllByRole('button', { name: '+1' })[0]);
  const values = [...container.querySelectorAll('.counter p')].map((p) => p.textContent.replace(/\s+/g, ' ').trim());
  expect(values).toEqual(['Count: 1', 'Count: 0']);
});

test('stores the count with useState', () => {
  expect(source).toMatch(/useState\s*\(\s*0\s*\)/);
});
