const valid = { name: 'Ada', email: 'ada@example.com', password: 'analytical' };

test('validate returns every message for empty values and {} for valid ones', () => {
  expect(mod.validate({ name: ' ', email: 'ada', password: 'short' })).toEqual({
    name: 'Name is required',
    email: 'Enter a valid email',
    password: 'Password must be at least 8 characters',
  });
  expect(mod.validate(valid)).toEqual({});
});

test('submitting an empty form shows the errors and does not call onSubmit', async () => {
  const onSubmit = fn();
  const SignupForm = mod.SignupForm;
  render(<SignupForm onSubmit={onSubmit} />);
  expect(screen.queryByText('Name is required')).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Sign up' }));
  expect(screen.getByText('Name is required')).toBeInTheDocument();
  expect(screen.getByText('Enter a valid email')).toBeInTheDocument();
  expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
  expect(onSubmit).not.toHaveBeenCalled();
});

test('invalid inputs get aria-invalid and aria-describedby pointing at the message', async () => {
  const SignupForm = mod.SignupForm;
  render(<SignupForm onSubmit={fn()} />);
  await user.type(screen.getByLabelText('Name'), 'Ada');
  await user.click(screen.getByRole('button', { name: 'Sign up' }));
  const email = screen.getByLabelText('Email');
  expect(email).toHaveAttribute('aria-invalid', 'true');
  const message = document.getElementById(email.getAttribute('aria-describedby'));
  expect(message).toHaveTextContent('Enter a valid email');
  expect(screen.getByLabelText('Name')).not.toHaveAttribute('aria-invalid');
});

test('a valid form calls onSubmit with { name, email, password }', async () => {
  const onSubmit = fn();
  const SignupForm = mod.SignupForm;
  render(<SignupForm onSubmit={onSubmit} />);
  await user.type(screen.getByLabelText('Name'), valid.name);
  await user.type(screen.getByLabelText('Email'), valid.email);
  await user.type(screen.getByLabelText('Password'), valid.password);
  await user.click(screen.getByRole('button', { name: 'Sign up' }));
  expect(onSubmit).toHaveBeenCalledTimes(1);
  expect(onSubmit.mock.calls[0][0]).toEqual(valid);
});

test('after a failed submit, fixing a field removes its error while typing', async () => {
  const SignupForm = mod.SignupForm;
  render(<SignupForm onSubmit={fn()} />);
  await user.click(screen.getByRole('button', { name: 'Sign up' }));
  expect(screen.getByText('Name is required')).toBeInTheDocument();
  await user.type(screen.getByLabelText('Name'), 'Grace');
  expect(screen.queryByText('Name is required')).toBeNull();
  expect(screen.getByText('Enter a valid email')).toBeInTheDocument();
});
