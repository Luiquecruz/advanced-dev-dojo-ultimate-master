const { provideHttpClient } = require('@angular/common/http');
const setup = () => render(mod.SignupForm, { providers: [provideHttpClient()] });
const createAccount = () => screen.getByRole('button', { name: 'Create account' });

async function fill(emailValue: string, password: string, confirmPassword: string) {
  await user.type(screen.getByLabelText('Email'), emailValue);
  await user.type(screen.getByLabelText('Password'), password);
  await user.type(screen.getByLabelText('Confirm password'), confirmPassword);
  await stable();
}

test('submitting an empty form reveals the required messages and registers nobody', async () => {
  await setup();
  expect(screen.queryByText('Email is required')).toBeNull();
  await user.click(createAccount());
  await stable();
  await waitFor(() => expect(screen.getByText('Email is required')).toBeInTheDocument());
  expect(screen.getByText('Password is required')).toBeInTheDocument();
  expect(screen.queryByRole('status')).toBeNull();
});

test('validates email format and password length after the fields are touched', async () => {
  await setup();
  await user.type(screen.getByLabelText('Email'), 'ada');
  await user.type(screen.getByLabelText('Password'), 'short');
  await user.tab();
  await stable();
  expect(screen.getByText('Enter a valid email')).toBeInTheDocument();
  expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
  expect(screen.queryByText('Email is required')).toBeNull();
});

test('a custom validate() rule reports "Passwords do not match" on confirmPassword', async () => {
  const { component } = await setup();
  await fill('new@example.com', 'secret123', 'secret124');
  await user.tab();
  await stable();
  expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
  expect(component.signupForm.confirmPassword().errors().map((error) => error.kind)).toEqual(['mismatch']);
  await user.clear(screen.getByLabelText('Confirm password'));
  await user.type(screen.getByLabelText('Confirm password'), 'secret123');
  await stable();
  expect(screen.queryByText('Passwords do not match')).toBeNull();
});

test('maps a server-side conflict onto the email field', async () => {
  const { component } = await setup();
  await fill('ada@example.com', 'secret123', 'secret123');
  await user.click(createAccount());
  await waitFor(() => expect(screen.getByText('Email already registered')).toBeInTheDocument());
  expect(component.signupForm.email().invalid()).toBe(true);
  expect(screen.queryByRole('status')).toBeNull();
});

test('registers a valid new account', async () => {
  await setup();
  await fill('new@example.com', 'secret123', 'secret123');
  await user.click(createAccount());
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Welcome, new@example.com!'));
});

test('uses schema validators, validate() and submit()', () => {
  expect(source).toMatch(/minLength\(\s*path\.password\s*,\s*8/);
  expect(source).toMatch(/validate\(\s*path\.confirmPassword/);
  expect(source).toMatch(/submit\(\s*this\.signupForm/);
});
