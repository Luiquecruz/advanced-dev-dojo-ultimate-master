const field = (label: string) => screen.getByLabelText(label);
const submitButton = () => screen.getByRole('button', { name: 'Log in' });

test('"Log in" is disabled until email and password are valid', async () => {
  await render(mod.LoginForm);
  expect(submitButton()).toBeDisabled();
  await user.type(field('Email'), 'ada@example.com');
  await user.type(field('Password'), 'analytical');
  await stable();
  expect(submitButton()).toBeEnabled();
});

test('shows email errors only after the field was touched', async () => {
  await render(mod.LoginForm);
  expect(screen.queryByText('Email is required')).toBeNull();
  await user.click(field('Email'));
  await user.tab();
  await stable();
  expect(screen.getByText('Email is required')).toBeInTheDocument();
  await user.type(field('Email'), 'ada');
  await stable();
  expect(screen.queryByText('Email is required')).toBeNull();
  expect(screen.getByText('Enter a valid email')).toBeInTheDocument();
});

test('shows the minlength error for short passwords', async () => {
  await render(mod.LoginForm);
  await user.type(field('Password'), 'short');
  await user.tab();
  await stable();
  expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
});

test('emits loggedIn with the typed form value on submit', async () => {
  const { component } = await render(mod.LoginForm);
  const spy = fn();
  component.loggedIn.subscribe(spy);
  await user.type(field('Email'), 'ada@example.com');
  await user.type(field('Password'), 'analytical');
  await user.click(screen.getByRole('checkbox', { name: 'Remember me' }));
  await stable();
  await user.click(submitButton());
  await stable();
  expect(spy).toHaveBeenCalledWith({ email: 'ada@example.com', password: 'analytical', remember: true });
});

test('"Use demo account" fills the inputs programmatically with patchValue', async () => {
  await render(mod.LoginForm);
  await user.click(screen.getByRole('button', { name: 'Use demo account' }));
  await stable();
  expect(field('Email')).toHaveValue('demo@example.com');
  expect(field('Password')).toHaveValue('demo-password');
  expect(submitButton()).toBeEnabled();
  expect(source).toMatch(/patchValue\(/);
});

test('uses ReactiveFormsModule with formControlName', () => {
  expect(source).toMatch(/\[formGroup\]/);
  expect(source).toMatch(/formControlName="email"/);
  expect(source).toMatch(/Validators\.minLength\(\s*8\s*\)/);
});
