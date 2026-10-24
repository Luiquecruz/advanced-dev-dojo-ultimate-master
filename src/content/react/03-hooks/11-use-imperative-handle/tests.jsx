test('the ref exposes exactly focus() and clear(), not the DOM node', () => {
  const { SearchInput } = mod;
  const ref = React.createRef();
  render(<SearchInput ref={ref} />);
  expect(ref.current).not.toBeInstanceOf(HTMLElement);
  expect(Object.keys(ref.current).sort()).toEqual(['clear', 'focus']);
});

test('focus() focuses the input', () => {
  const { SearchInput } = mod;
  const ref = React.createRef();
  render(<SearchInput ref={ref} />);
  act(() => ref.current.focus());
  expect(screen.getByLabelText('Search')).toHaveFocus();
});

test('clear() empties the typed text', async () => {
  const { SearchInput } = mod;
  const ref = React.createRef();
  render(<SearchInput ref={ref} label="Find" />);
  await user.type(screen.getByLabelText('Find'), 'hooks');
  expect(screen.getByLabelText('Find')).toHaveValue('hooks');
  act(() => ref.current.clear());
  expect(screen.getByLabelText('Find')).toHaveValue('');
});

test('App buttons drive the input through the handle', async () => {
  const App = mod.default;
  render(<App />);
  await user.type(screen.getByLabelText('Search'), 'react');
  await user.click(screen.getByRole('button', { name: 'Clear' }));
  expect(screen.getByLabelText('Search')).toHaveValue('');
  await user.click(screen.getByRole('button', { name: 'Focus search' }));
  expect(screen.getByLabelText('Search')).toHaveFocus();
});

test('uses useImperativeHandle', () => {
  expect(source).toMatch(/useImperativeHandle\s*\(/);
});
