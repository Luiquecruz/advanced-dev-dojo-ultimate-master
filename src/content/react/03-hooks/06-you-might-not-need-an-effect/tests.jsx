const PRODUCTS = [
  { id: 1, name: 'Keyboard' },
  { id: 2, name: 'Mouse' },
  { id: 3, name: 'Monitor' },
];

test('filters products by name (case-insensitive) and shows the count', async () => {
  const ProductSearch = mod.default;
  render(<ProductSearch products={PRODUCTS} onSearch={fn()} />);
  expect(screen.getByText('3 results')).toBeInTheDocument();
  await user.type(screen.getByLabelText('Search'), 'MO');
  expect(screen.getByText('2 results')).toBeInTheDocument();
  expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Mouse', 'Monitor']);
});

test('renders the filtered list in the very first commit (no extra render pass)', () => {
  const ProductSearch = mod.default;
  const onRender = fn();
  render(
    <React.Profiler id="search" onRender={onRender}>
      <ProductSearch products={PRODUCTS} onSearch={fn()} />
    </React.Profiler>,
  );
  expect(onRender).toHaveBeenCalledTimes(1);
});

test('typing one character causes exactly one commit', () => {
  const ProductSearch = mod.default;
  const onRender = fn();
  render(
    <React.Profiler id="search" onRender={onRender}>
      <ProductSearch products={PRODUCTS} onSearch={fn()} />
    </React.Profiler>,
  );
  const before = onRender.mock.calls.length;
  fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'k' } });
  expect(onRender.mock.calls.length - before).toBe(1);
});

test('calls onSearch from the change handler, never on mount', () => {
  const ProductSearch = mod.default;
  const onSearch = fn();
  render(<ProductSearch products={PRODUCTS} onSearch={onSearch} />);
  expect(onSearch).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'k' } });
  expect(onSearch).toHaveBeenCalledTimes(1);
  expect(onSearch).toHaveBeenCalledWith('k');
});

test('does not use useEffect', () => {
  expect(source).not.toMatch(/useEffect/);
});
