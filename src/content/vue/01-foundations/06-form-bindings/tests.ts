test('binds the name with .trim', async () => {
  render(mod.default);
  await user.type(screen.getByLabelText('Name'), '  Ada  ');
  await user.tab();
  expect(screen.getByTestId('name')).toHaveTextContent('"Ada"');
});

test('binds the age as a number with .number', async () => {
  render(mod.default);
  await user.type(screen.getByLabelText('Age'), '36');
  expect(screen.getByTestId('age').textContent).toBe('36');
});

test('checks "Free" initially and switches the plan with the radios', async () => {
  render(mod.default);
  expect(screen.getByLabelText('Free')).toBeChecked();
  await user.click(screen.getByLabelText('Pro'));
  expect(screen.getByTestId('plan').textContent).toBe('"pro"');
  expect(screen.getByLabelText('Free')).not.toBeChecked();
});

test('toggles the newsletter boolean', async () => {
  render(mod.default);
  await user.click(screen.getByLabelText('Newsletter'));
  expect(screen.getByTestId('newsletter').textContent).toBe('true');
  await user.click(screen.getByLabelText('Newsletter'));
  expect(screen.getByTestId('newsletter').textContent).toBe('false');
});

test('collects checked topics into an array', async () => {
  render(mod.default);
  await user.click(screen.getByLabelText('Vue'));
  await user.click(screen.getByLabelText('TypeScript'));
  expect(screen.getByTestId('topics').textContent).toBe('["vue","ts"]');
  await user.click(screen.getByLabelText('Vue'));
  expect(screen.getByTestId('topics').textContent).toBe('["ts"]');
});

test('binds the country select', async () => {
  render(mod.default);
  await user.selectOptions(screen.getByLabelText('Country'), 'pt');
  expect(screen.getByTestId('country').textContent).toBe('"pt"');
});
