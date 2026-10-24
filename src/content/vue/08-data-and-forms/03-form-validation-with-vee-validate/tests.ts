async function submit() {
  await user.click(screen.getByRole('button', { name: 'Sign up' }));
  await flushPromises();
}

test('submitting the empty form shows both required messages and no welcome', async () => {
  render(mod.default);
  await submit();
  expect(await screen.findByText('Email is required')).toBeInTheDocument();
  expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
  expect(screen.queryByRole('status')).toBeNull();
});

test('a malformed email shows "Enter a valid email"', async () => {
  render(mod.default);
  await user.type(screen.getByLabelText('Email'), 'ada@');
  await user.type(screen.getByLabelText('Password'), 'analytical');
  await submit();
  expect(await screen.findByText('Enter a valid email')).toBeInTheDocument();
  expect(screen.queryByRole('status')).toBeNull();
});

test('a valid form submits and shows "Welcome, <email>!"', async () => {
  render(mod.default);
  await user.type(screen.getByLabelText('Email'), 'ada@example.com');
  await user.type(screen.getByLabelText('Password'), 'analytical');
  await submit();
  expect(await screen.findByRole('status')).toHaveTextContent('Welcome, ada@example.com!');
  expect(document.querySelectorAll('.error')).toHaveLength(0);
});

test('fixing a field clears its error', async () => {
  render(mod.default);
  await submit();
  await screen.findByText('Email is required');
  await user.type(screen.getByLabelText('Email'), 'grace@example.com');
  await flushPromises();
  await waitFor(() => expect(screen.queryByText('Email is required')).toBeNull());
  expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
});

test('validates through useForm with a validationSchema and handleSubmit', () => {
  expect(source).toMatch(/validationSchema/);
  expect(source).toMatch(/handleSubmit\s*\(/);
});
