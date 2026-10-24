test('shows every product and "Total: $754" initially', () => {
  render(mod.default);
  expect(screen.getAllByRole('listitem')).toHaveLength(5);
  expect(screen.getByText('Total: $754')).toBeInTheDocument();
});

test('filters by name, case-insensitive, and updates the total', async () => {
  render(mod.default);
  await user.type(screen.getByLabelText('Search'), 'MO');
  const names = screen.getAllByRole('listitem').map((item) => item.textContent);
  expect(names).toEqual(['Mouse ($45)', 'Monitor ($340)']);
  expect(screen.getByText('Total: $385')).toBeInTheDocument();
});

test('filters by max price', async () => {
  render(mod.default);
  const maxPrice = screen.getByLabelText('Max price');
  await user.clear(maxPrice);
  await user.type(maxPrice, '100');
  expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Mouse ($45)', 'Cloud Credits ($50)']);
  expect(screen.getByText('Total: $95')).toBeInTheDocument();
});

test('writes firstName and lastName through the fullName computed', async () => {
  render(mod.default);
  const input = screen.getByLabelText('Full name');
  expect(input).toHaveValue('Ada Lovelace');
  await user.clear(input);
  await user.type(input, 'Grace Brewster Hopper');
  await user.tab();
  expect(screen.getByLabelText('First')).toHaveTextContent('Grace');
  expect(screen.getByLabelText('Last')).toHaveTextContent('Brewster Hopper');
});

test('uses computed() for filtered, total and fullName (with get and set)', () => {
  expect(source).toMatch(/filtered\s*=\s*computed\(/);
  expect(source).toMatch(/total\s*=\s*computed\(/);
  expect(source).toMatch(/fullName\s*=\s*computed\(\s*\{[^]*\bget\b[^]*\bset\b/);
});
