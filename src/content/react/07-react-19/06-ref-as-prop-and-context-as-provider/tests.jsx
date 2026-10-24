test('TextInput passes the ref prop to its <input>', () => {
  const { TextInput } = mod;
  const ref = React.createRef();
  render(<TextInput label="Name" ref={ref} placeholder="Your name" />);
  expect(ref.current).toBe(screen.getByLabelText('Name'));
  expect(ref.current).toHaveAttribute('placeholder', 'Your name');
});

test('clicking "Focus search" focuses the search input', async () => {
  const SearchPanel = mod.default;
  render(<SearchPanel />);
  await user.click(screen.getByRole('button', { name: 'Focus search' }));
  expect(screen.getByLabelText('Search')).toHaveFocus();
});

test('provides the theme to ThemedPanel through ThemeContext', () => {
  const SearchPanel = mod.default;
  const { container, rerender } = render(<SearchPanel />);
  expect(container.querySelector('section')).toHaveAttribute('data-theme', 'dark');
  rerender(<SearchPanel theme="light" />);
  expect(container.querySelector('section')).toHaveAttribute('data-theme', 'light');
});

test('renders <ThemeContext value> instead of ThemeContext.Provider', () => {
  expect(source).toMatch(/<ThemeContext\s+value=/);
  expect(source).not.toMatch(/\.Provider/);
});

test('does not use forwardRef', () => {
  expect(source).not.toMatch(/forwardRef/);
});
