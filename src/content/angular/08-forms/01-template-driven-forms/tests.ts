async function fill(name: string, email: string) {
  if (name) await user.type(screen.getByLabelText('Name'), name);
  if (email) await user.type(screen.getByLabelText('Email'), email);
  await stable();
}

test('the Subscribe button is disabled while the form is empty', async () => {
  await render(mod.Newsletter);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Subscribe' })).toBeDisabled());
});

test('enables the button only once name and email are valid', async () => {
  await render(mod.Newsletter);
  await fill('Ada', 'not-an-email');
  expect(screen.getByRole('button', { name: 'Subscribe' })).toBeDisabled();
  await user.clear(screen.getByLabelText('Email'));
  await fill('', 'ada@example.com');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Subscribe' })).toBeEnabled());
});

test('shows the min length error only after the name field was touched', async () => {
  await render(mod.Newsletter);
  await user.type(screen.getByLabelText('Name'), 'A');
  await stable();
  expect(screen.queryByText('Name must be at least 2 characters')).toBeNull();
  await user.tab();
  await stable();
  await waitFor(() => expect(screen.getByText('Name must be at least 2 characters')).toBeInTheDocument());
});

test('submitting thanks the user and resets the form', async () => {
  await render(mod.Newsletter);
  await fill('Ada', 'ada@example.com');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Subscribe' })).toBeEnabled());
  await user.click(screen.getByRole('button', { name: 'Subscribe' }));
  await stable();
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Thanks, Ada!'));
  await waitFor(() => expect(screen.getByLabelText('Name')).toHaveValue(''));
  expect(screen.getByRole('button', { name: 'Subscribe' })).toBeDisabled();
});

test('uses ngModel with FormsModule (template-driven)', () => {
  expect(source).toMatch(/FormsModule/);
  expect(source).toMatch(/\[\(ngModel\)\]/);
  expect(source).toMatch(/ngForm/);
});
