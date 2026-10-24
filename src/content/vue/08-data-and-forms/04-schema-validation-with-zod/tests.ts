const { signupSchema } = modules['schema.ts'];
const { toTypedSchema } = modules['toTypedSchema.ts'];

const valid = { email: 'ada@example.com', password: 'analytical', confirm: 'analytical' };

function messages(values: unknown) {
  const result = signupSchema.safeParse(values);
  return result.success ? [] : result.error.issues.map((issue: { message: string }) => issue.message);
}

test('signupSchema accepts valid values', () => {
  expect(signupSchema.safeParse(valid).success).toBe(true);
});

test('signupSchema rejects a bad email and a short password with the exact messages', () => {
  expect(messages({ ...valid, email: 'ada@' })).toContain('Enter a valid email');
  expect(messages({ ...valid, password: 'short', confirm: 'short' })).toContain('Password must be at least 8 characters');
});

test('signupSchema reports mismatched passwords on the "confirm" path', () => {
  const result = signupSchema.safeParse({ ...valid, confirm: 'different' });
  expect(result.success).toBe(false);
  expect(result.error.issues[0].path).toEqual(['confirm']);
  expect(result.error.issues[0].message).toBe('Passwords do not match');
});

test('toTypedSchema maps zod issues to { path, errors } and valid data to { value, errors: [] }', async () => {
  const typed = toTypedSchema(signupSchema);
  expect(typed.__type).toBe('VVTypedSchema');
  const failed = await typed.parse({ ...valid, email: 'nope' });
  expect(failed.errors).toEqual([{ path: 'email', errors: ['Enter a valid email'] }]);
  const passed = await typed.parse(valid);
  expect(passed.errors).toEqual([]);
  expect(passed.value).toEqual(valid);
});

test('the form shows schema errors and welcomes a valid sign-up', async () => {
  render(mod.default);
  await user.type(screen.getByLabelText('Email'), 'ada@example.com');
  await user.type(screen.getByLabelText('Password'), 'analytical');
  await user.type(screen.getByLabelText('Confirm password'), 'analytic');
  await user.click(screen.getByRole('button', { name: 'Sign up' }));
  expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
  expect(screen.queryByRole('status')).toBeNull();
  await user.type(screen.getByLabelText('Confirm password'), 'al');
  await user.click(screen.getByRole('button', { name: 'Sign up' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Welcome, ada@example.com!');
});
