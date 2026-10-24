test('renders an <h1> title and a logo named "Dojo logo"', () => {
  const { LoginForm } = mod;
  render(<LoginForm onSubmit={fn()} />);
  expect(screen.getByRole('heading', { level: 1, name: 'Sign in to the Dojo' })).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'Dojo logo' })).toBeInTheDocument();
});

test('fields are labeled Email, Password and Remember me', () => {
  const { LoginForm } = mod;
  render(<LoginForm onSubmit={fn()} />);
  expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
  expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  expect(screen.getByRole('checkbox', { name: 'Remember me' })).not.toBeChecked();
});

test('the submit control is a <button type="submit"> named "Sign in"', () => {
  const { LoginForm } = mod;
  render(<LoginForm onSubmit={fn()} />);
  expect(screen.getByRole('button', { name: 'Sign in' })).toHaveAttribute('type', 'submit');
});

test('submitting empty fields shows an alert and does not call onSubmit', async () => {
  const { LoginForm } = mod;
  const onSubmit = fn();
  render(<LoginForm onSubmit={onSubmit} />);
  expect(screen.queryByRole('alert')).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Email and password are required');
  expect(onSubmit).not.toHaveBeenCalled();
});

test('valid input calls onSubmit with email, password and remember', async () => {
  const { LoginForm } = mod;
  const onSubmit = fn();
  render(<LoginForm onSubmit={onSubmit} />);
  await user.type(screen.getByLabelText('Email'), 'ada@example.com');
  await user.type(screen.getByLabelText('Password'), 'engine');
  await user.click(screen.getByRole('checkbox', { name: 'Remember me' }));
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
  expect(onSubmit).toHaveBeenCalledTimes(1);
  expect(onSubmit).toHaveBeenCalledWith({ email: 'ada@example.com', password: 'engine', remember: true });
});

test('pressing Enter in the password field submits the form', async () => {
  const { LoginForm } = mod;
  const onSubmit = fn();
  render(<LoginForm onSubmit={onSubmit} />);
  await user.type(screen.getByLabelText('Email'), 'grace@example.com');
  await user.type(screen.getByLabelText('Password'), 'cobol{Enter}');
  expect(onSubmit).toHaveBeenCalledWith({ email: 'grace@example.com', password: 'cobol', remember: false });
});
