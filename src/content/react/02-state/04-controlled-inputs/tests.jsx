const noop = () => undefined;
const greeting = (container) => container.querySelector('p.greeting').textContent.replace(/\s+/g, ' ').trim();

test('greets the trimmed name while typing and falls back to "stranger"', async () => {
  const SignupForm = mod.default;
  const { container } = render(<SignupForm onSubmit={noop} />);
  expect(greeting(container)).toBe('Hello, stranger!');
  await user.type(screen.getByRole('textbox', { name: 'Name' }), '  Ada ');
  expect(greeting(container)).toBe('Hello, Ada!');
  await user.clear(screen.getByRole('textbox', { name: 'Name' }));
  await user.type(screen.getByRole('textbox', { name: 'Name' }), '   ');
  expect(greeting(container)).toBe('Hello, stranger!');
});

test('normalizes the username to lowercase without whitespace', async () => {
  const SignupForm = mod.default;
  render(<SignupForm onSubmit={noop} />);
  const username = screen.getByRole('textbox', { name: 'Username' });
  await user.type(username, 'Ada Lovelace');
  expect(username).toHaveValue('adalovelace');
});

test('keeps "Sign up" disabled until name, username and terms are provided', async () => {
  const SignupForm = mod.default;
  render(<SignupForm onSubmit={noop} />);
  const button = screen.getByRole('button', { name: 'Sign up' });
  expect(button).toBeDisabled();
  await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Ada');
  await user.type(screen.getByRole('textbox', { name: 'Username' }), 'ada');
  expect(button).toBeDisabled();
  await user.click(screen.getByRole('checkbox', { name: 'I accept the terms' }));
  expect(button).toBeEnabled();
  await user.click(screen.getByRole('checkbox', { name: 'I accept the terms' }));
  expect(button).toBeDisabled();
});

test('submits every field value through onSubmit', async () => {
  const SignupForm = mod.default;
  const onSubmit = fn();
  render(<SignupForm onSubmit={onSubmit} />);
  await user.type(screen.getByRole('textbox', { name: 'Name' }), ' Grace Hopper ');
  await user.type(screen.getByRole('textbox', { name: 'Username' }), 'Grace');
  await user.selectOptions(screen.getByRole('combobox', { name: 'Plan' }), 'pro');
  await user.click(screen.getByRole('checkbox', { name: 'I accept the terms' }));
  await user.click(screen.getByRole('button', { name: 'Sign up' }));
  expect(onSubmit).toHaveBeenCalledTimes(1);
  expect(onSubmit).toHaveBeenCalledWith({ name: 'Grace Hopper', username: 'grace', plan: 'pro', acceptedTerms: true });
});

test('controls the fields with value and checked', () => {
  expect(source.match(/\bvalue=\{/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  expect(source).toMatch(/\bchecked=\{/);
});
