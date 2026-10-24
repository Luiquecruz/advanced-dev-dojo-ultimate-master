const { z } = require('zod');
const schema = () => modules['schema.js'].signupSchema;
const validInput = { username: '  ada  ', email: 'ada@example.com', age: '36', password: 'analytical', confirmPassword: 'analytical' };

test('the schema parses valid input, trimming the username and coercing age to a number', () => {
  const result = schema().safeParse(validInput);
  expect(result.success).toBe(true);
  expect(result.data).toEqual({ username: 'ada', email: 'ada@example.com', age: 36, password: 'analytical', confirmPassword: 'analytical' });
});

test('the schema reports a message per invalid field', () => {
  const result = schema().safeParse({ username: 'al', email: 'nope', age: '12', password: 'short', confirmPassword: 'short' });
  expect(result.success).toBe(false);
  const { fieldErrors } = z.flattenError(result.error);
  expect(fieldErrors.username).toContain('Username must be at least 3 characters');
  expect(fieldErrors.email).toContain('Enter a valid email');
  expect(fieldErrors.age).toContain('You must be at least 18');
  expect(fieldErrors.password).toContain('Password must be at least 8 characters');
});

test('mismatched passwords produce an issue on the confirmPassword path', () => {
  const result = schema().safeParse({ ...validInput, confirmPassword: 'different' });
  expect(result.success).toBe(false);
  const issue = result.error.issues.find((entry) => entry.path.join('.') === 'confirmPassword');
  expect(issue).toBeDefined();
  expect(issue.message).toBe('Passwords do not match');
});

test('the form shows the schema messages on submit and does not call onSubmit', async () => {
  const onSubmit = fn();
  const SignupForm = mod.SignupForm;
  render(<SignupForm onSubmit={onSubmit} />);
  await user.type(screen.getByLabelText('Email'), 'nope');
  await user.type(screen.getByLabelText('Password'), 'analytical');
  await user.type(screen.getByLabelText('Confirm password'), 'analytic');
  await user.click(screen.getByRole('button', { name: 'Sign up' }));
  expect(await screen.findByText('Enter a valid email')).toBeInTheDocument();
  expect(screen.getByText('Username must be at least 3 characters')).toBeInTheDocument();
  expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
  expect(onSubmit).not.toHaveBeenCalled();
});

test('a valid form calls onSubmit with the parsed output', async () => {
  const onSubmit = fn();
  const SignupForm = mod.SignupForm;
  render(<SignupForm onSubmit={onSubmit} />);
  await user.type(screen.getByLabelText('Username'), '  grace  ');
  await user.type(screen.getByLabelText('Email'), 'grace@example.com');
  await user.type(screen.getByLabelText('Age'), '45');
  await user.type(screen.getByLabelText('Password'), 'cobol1959');
  await user.type(screen.getByLabelText('Confirm password'), 'cobol1959');
  await user.click(screen.getByRole('button', { name: 'Sign up' }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  expect(onSubmit.mock.calls[0][0]).toEqual({ username: 'grace', email: 'grace@example.com', age: 45, password: 'cobol1959', confirmPassword: 'cobol1959' });
});

test('uses zodResolver and the Zod 4 z.email() format', () => {
  expect(sources['App.jsx']).toMatch(/zodResolver\(\s*signupSchema\s*\)/);
  expect(sources['schema.js']).toMatch(/z\.email\(/);
  expect(sources['schema.js']).not.toMatch(/\.string\(\)\s*\.email\(/);
});
