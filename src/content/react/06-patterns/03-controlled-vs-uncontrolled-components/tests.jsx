test('NewsletterForm is uncontrolled: defaultValue fills the input', () => {
  const { NewsletterForm } = mod;
  render(<NewsletterForm defaultEmail="ada@example.com" onSubscribe={() => {}} />);
  expect(screen.getByLabelText('Email')).toHaveValue('ada@example.com');
  expect(source).toMatch(/defaultValue/);
  expect(source).toMatch(/new\s+FormData/);
});

test('NewsletterForm submits the typed email via FormData and resets', async () => {
  const { NewsletterForm } = mod;
  const onSubscribe = fn();
  render(<NewsletterForm onSubscribe={onSubscribe} />);
  const input = screen.getByLabelText('Email');
  await user.type(input, 'grace@example.com');
  await user.click(screen.getByRole('button', { name: 'Subscribe' }));
  expect(onSubscribe).toHaveBeenCalledWith('grace@example.com');
  expect(input).toHaveValue('');
});

test('Stepper uncontrolled: starts at defaultValue, updates itself and reports onChange', async () => {
  const { Stepper } = mod;
  const onChange = fn();
  const { container } = render(<Stepper defaultValue={5} onChange={onChange} />);
  await user.click(screen.getByRole('button', { name: '+' }));
  expect(container.querySelector('output')).toHaveTextContent('6');
  expect(onChange).toHaveBeenLastCalledWith(6);
  await user.click(screen.getByRole('button', { name: '-' }));
  await user.click(screen.getByRole('button', { name: '-' }));
  expect(container.querySelector('output')).toHaveTextContent('4');
});

test('Stepper controlled: shows value, calls onChange and never changes on its own', async () => {
  const { Stepper } = mod;
  const onChange = fn();
  const { container, rerender } = render(<Stepper value={0} onChange={onChange} />);
  await user.click(screen.getByRole('button', { name: '+' }));
  expect(onChange).toHaveBeenCalledWith(1);
  expect(container.querySelector('output')).toHaveTextContent('0');
  rerender(<Stepper value={10} onChange={onChange} />);
  expect(container.querySelector('output')).toHaveTextContent('10');
});

test('App controls the Stepper: "+" updates the quantity and "Reset" sets it to 0', async () => {
  const App = mod.default;
  const { container } = render(<App />);
  await user.click(screen.getByRole('button', { name: '+' }));
  expect(screen.getByText('Quantity: 2')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Reset' }));
  expect(screen.getByText('Quantity: 0')).toBeInTheDocument();
  expect(container.querySelector('output')).toHaveTextContent('0');
});
