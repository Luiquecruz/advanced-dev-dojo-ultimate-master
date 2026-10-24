const noop = () => undefined;

test('does not call onClear while rendering', () => {
  const SearchForm = mod.default;
  const onClear = fn();
  render(<SearchForm onSearch={noop} onClear={onClear} />);
  expect(onClear).not.toHaveBeenCalled();
});

test('calls onClear once when Clear is clicked, without submitting', async () => {
  const SearchForm = mod.default;
  const onClear = fn();
  const onSearch = fn();
  render(<SearchForm onSearch={onSearch} onClear={onClear} />);
  await user.type(screen.getByRole('textbox', { name: 'Search' }), 'hooks');
  await user.click(screen.getByRole('button', { name: 'Clear' }));
  expect(onClear).toHaveBeenCalledTimes(1);
  expect(onSearch).not.toHaveBeenCalled();
});

test('prevents the default form submission', () => {
  const SearchForm = mod.default;
  render(<SearchForm onSearch={noop} onClear={noop} />);
  const notCanceled = fireEvent.submit(screen.getByRole('search'));
  expect(notCanceled).toBe(false);
});

test('calls onSearch with the trimmed query', async () => {
  const SearchForm = mod.default;
  const onSearch = fn();
  render(<SearchForm onSearch={onSearch} onClear={noop} />);
  await user.type(screen.getByRole('textbox', { name: 'Search' }), '  react hooks  ');
  await user.click(screen.getByRole('button', { name: 'Search' }));
  expect(onSearch).toHaveBeenCalledTimes(1);
  expect(onSearch).toHaveBeenCalledWith('react hooks');
});

test('does not call onSearch for an empty or blank query', async () => {
  const SearchForm = mod.default;
  const onSearch = fn();
  render(<SearchForm onSearch={onSearch} onClear={noop} />);
  await user.click(screen.getByRole('button', { name: 'Search' }));
  await user.type(screen.getByRole('textbox', { name: 'Search' }), '   ');
  await user.click(screen.getByRole('button', { name: 'Search' }));
  expect(onSearch).not.toHaveBeenCalled();
});
