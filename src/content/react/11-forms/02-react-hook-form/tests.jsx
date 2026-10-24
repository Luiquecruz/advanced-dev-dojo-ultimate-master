function renderForm(onLogin = fn().mockResolvedValue(undefined)) {
  const LoginForm = mod.LoginForm;
  render(<LoginForm onLogin={onLogin} />);
  return onLogin;
}

async function fillAndSubmit(email, password) {
  if (email) await user.type(screen.getByLabelText('Email'), email);
  if (password) await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Log in' }));
}

test('an empty submit shows the required messages and does not call onLogin', async () => {
  const onLogin = renderForm();
  await fillAndSubmit();
  expect(await screen.findByText('Email is required')).toBeInTheDocument();
  expect(screen.getByText('Password is required')).toBeInTheDocument();
  expect(onLogin).not.toHaveBeenCalled();
});

test('an invalid email and a short password show the rule messages', async () => {
  renderForm();
  await fillAndSubmit('ada', 'short');
  expect(await screen.findByText('Enter a valid email')).toBeInTheDocument();
  expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
});

test('a valid submit calls onLogin with { email, password }', async () => {
  const onLogin = renderForm();
  await fillAndSubmit('ada@example.com', 'password123');
  await waitFor(() => expect(onLogin).toHaveBeenCalledTimes(1));
  expect(onLogin.mock.calls[0][0]).toEqual({ email: 'ada@example.com', password: 'password123' });
});

test('the button is disabled and reads "Logging in..." while onLogin is pending', async () => {
  renderForm(fn(() => new Promise((resolve) => setTimeout(resolve, 300))));
  await fillAndSubmit('ada@example.com', 'password123');
  const button = await screen.findByRole('button', { name: 'Logging in...' });
  expect(button).toBeDisabled();
  expect(await screen.findByRole('button', { name: 'Log in' }, { timeout: 1500 })).toBeEnabled();
});

test('a rejected onLogin is shown as a root server error in an alert', async () => {
  renderForm(fn(() => Promise.reject(new Error('Invalid credentials'))));
  await fillAndSubmit('ada@example.com', 'password123');
  expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
});

test('uses useForm and register instead of useState for the fields', () => {
  expect(source).toMatch(/useForm\s*\(/);
  expect(source).toMatch(/register\(\s*['"]email['"]/);
  expect(source).toMatch(/register\(\s*['"]password['"]/);
  expect(source).toMatch(/setError\(/);
});
