test('typing a name writes straight into the model signal', async () => {
  const { component } = await render(mod.ProfileEditor);
  expect(screen.getByText('Hello, stranger')).toBeInTheDocument();
  await user.type(screen.getByLabelText('Name'), 'Ada');
  await stable();
  expect(component.model().name).toBe('Ada');
  expect(screen.getByText('Hello, Ada')).toBeInTheDocument();
});

test('binds nested fields, checkboxes and number inputs with the right types', async () => {
  const { component } = await render(mod.ProfileEditor);
  await user.type(screen.getByLabelText('City'), 'London');
  await user.click(screen.getByRole('checkbox', { name: 'Newsletter' }));
  await user.clear(screen.getByLabelText('Age'));
  await user.type(screen.getByLabelText('Age'), '36');
  await stable();
  expect(component.model()).toEqual({ name: '', age: 36, address: { city: 'London' }, newsletter: true });
  expect(screen.getByText('Sending news to London')).toBeInTheDocument();
});

test('setting the model from code updates every input', async () => {
  await render(mod.ProfileEditor);
  await user.click(screen.getByRole('button', { name: 'Load sample' }));
  await stable();
  expect(screen.getByLabelText('Name')).toHaveValue('Grace Hopper');
  expect(screen.getByLabelText('Age')).toHaveValue(85);
  expect(screen.getByLabelText('City')).toHaveValue('Arlington');
  expect(screen.getByRole('checkbox', { name: 'Newsletter' })).toBeChecked();
  expect(screen.getByText('No changes')).toBeInTheDocument();
});

test('tracks dirty state and Reset restores the empty profile', async () => {
  const { component } = await render(mod.ProfileEditor);
  expect(screen.getByText('No changes')).toBeInTheDocument();
  await user.type(screen.getByLabelText('Name'), 'Linus');
  await stable();
  expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Reset' }));
  await stable();
  expect(screen.getByText('No changes')).toBeInTheDocument();
  expect(screen.getByLabelText('Name')).toHaveValue('');
  expect(component.model()).toEqual(mod.EMPTY_PROFILE);
});

test('uses form() and the [formField] directive', () => {
  expect(source).toMatch(/form\(\s*this\.model\s*\)/);
  expect(source).toMatch(/\[formField\]="profileForm\.address\.city"/);
});
