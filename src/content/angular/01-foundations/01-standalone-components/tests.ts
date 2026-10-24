test('renders "Count: 0" initially', async () => {
  await render(mod.Counter);
  expect(screen.getByText('Count: 0')).toBeInTheDocument();
});

test('increments when the button is clicked', async () => {
  await render(mod.Counter);
  await user.click(screen.getByRole('button', { name: 'Increment' }));
  await stable();
  expect(screen.getByText('Count: 1')).toBeInTheDocument();
});

test('shows "Nice!" only when count >= 3', async () => {
  await render(mod.Counter);
  const button = screen.getByRole('button', { name: 'Increment' });
  await user.click(button);
  await user.click(button);
  await stable();
  expect(screen.queryByText('Nice!')).toBeNull();
  await user.click(button);
  await stable();
  expect(screen.getByText('Nice!').tagName).toBe('STRONG');
});

test('uses a signal and the @if block', () => {
  expect(source).toMatch(/signal\(\s*0\s*\)/);
  expect(source).toMatch(/@if\s*\(/);
});
