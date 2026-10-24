test('LegacyInput is a forwardRef component that forwards the ref to the <input>', () => {
  const { LegacyInput } = mod;
  expect(LegacyInput.$$typeof).toBe(Symbol.for('react.forward_ref'));
  const ref = React.createRef();
  render(<LegacyInput label="Email" ref={ref} />);
  expect(ref.current).toBe(screen.getByLabelText('Email'));
});

test('ModernInput is a plain function that reads ref as a prop', () => {
  const { ModernInput } = mod;
  expect(typeof ModernInput).toBe('function');
  const ref = React.createRef();
  render(<ModernInput label="Phone" ref={ref} />);
  expect(ref.current).toBe(screen.getByLabelText('Phone'));
});

test('SearchForm stores a createRef() object on the instance pointing to the input', () => {
  const { SearchForm } = mod;
  const instanceRef = React.createRef();
  render(<SearchForm ref={instanceRef} />);
  expect(instanceRef.current.inputRef).toHaveProperty('current');
  expect(instanceRef.current.inputRef.current).toBe(screen.getByLabelText('Search'));
  expect(source).toMatch(/createRef\(\)/);
});

test('SearchForm focuses the input in componentDidMount', () => {
  const { SearchForm } = mod;
  render(<SearchForm />);
  expect(screen.getByLabelText('Search')).toHaveFocus();
});

test('"Clear" empties the input and focuses it again', async () => {
  const { SearchForm } = mod;
  render(<SearchForm />);
  const input = screen.getByLabelText('Search');
  await user.type(input, 'hooks');
  await user.click(screen.getByRole('button', { name: 'Clear' }));
  expect(input).toHaveValue('');
  expect(input).toHaveFocus();
});
