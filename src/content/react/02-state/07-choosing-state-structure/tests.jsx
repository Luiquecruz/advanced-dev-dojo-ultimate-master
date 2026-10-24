const read = (container, selector) => container.querySelector(selector).textContent.replace(/\s+/g, ' ').trim();

test('shows the initial total and nothing selected', () => {
  const Cart = mod.default;
  const { container } = render(<Cart />);
  expect(read(container, 'p.total')).toBe('Total: $550');
  expect(read(container, 'p.selected')).toBe('Nothing selected');
});

test('the total follows increases and decreases', async () => {
  const Cart = mod.default;
  const { container } = render(<Cart />);
  await user.click(screen.getByRole('button', { name: 'Increase Keyboard' }));
  expect(read(container, 'p.total')).toBe('Total: $670');
  await user.click(screen.getByRole('button', { name: 'Decrease Mouse' }));
  expect(read(container, 'p.total')).toBe('Total: $625');
  await user.click(screen.getByRole('button', { name: 'Decrease Monitor' }));
  expect(read(container, 'p.total')).toBe('Total: $285');
});

test('the selected details show the current quantity', async () => {
  const Cart = mod.default;
  const { container } = render(<Cart />);
  await user.click(screen.getByRole('button', { name: 'Mouse' }));
  expect(read(container, 'p.selected')).toBe('Selected: Mouse × 2');
  await user.click(screen.getByRole('button', { name: 'Increase Mouse' }));
  expect(read(container, 'p.selected')).toBe('Selected: Mouse × 3');
});

test('removing the selected item shows "Nothing selected"', async () => {
  const Cart = mod.default;
  const { container } = render(<Cart />);
  await user.click(screen.getByRole('button', { name: 'Keyboard' }));
  await user.click(screen.getByRole('button', { name: 'Decrease Keyboard' }));
  expect(screen.queryByRole('button', { name: 'Keyboard' })).toBeNull();
  expect(read(container, 'p.selected')).toBe('Nothing selected');
  expect(read(container, 'p.total')).toBe('Total: $430');
});

test('keeps selectedId in state and derives total and the selected item', () => {
  expect(source).toMatch(/\[\s*selectedId\s*,\s*setSelectedId\s*\]\s*=\s*useState/);
  expect(source).not.toMatch(/setTotal|setSelectedItem/);
});
