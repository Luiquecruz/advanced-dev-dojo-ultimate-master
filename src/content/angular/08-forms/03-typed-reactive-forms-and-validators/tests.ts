const { FormControl, FormGroup } = require('@angular/forms');

test('forbiddenNameValidator flags reserved names case-insensitively', () => {
  const validator = modules['validators.ts'].forbiddenNameValidator(['admin', 'root']);
  expect(validator(new FormControl('Admin'))).toEqual({ forbiddenName: { value: 'Admin' } });
  expect(validator(new FormControl(' root '))).toEqual({ forbiddenName: { value: ' root ' } });
  expect(validator(new FormControl('ada'))).toBeNull();
});

test('passwordsMatchValidator compares password and confirmPassword on the group', () => {
  const { passwordsMatchValidator } = modules['validators.ts'];
  const group = new FormGroup({ password: new FormControl('secret123'), confirmPassword: new FormControl('secret12') });
  expect(passwordsMatchValidator(group)).toEqual({ passwordsMismatch: true });
  group.controls.confirmPassword.setValue('secret123');
  expect(passwordsMatchValidator(group)).toBeNull();
});

test('shows "This username is reserved" for a forbidden username', async () => {
  await render(mod.Signup);
  await user.type(screen.getByLabelText('Username'), 'root');
  await stable();
  expect(screen.getByText('This username is reserved')).toBeInTheDocument();
});

test('shows "Passwords do not match" until both passwords are equal', async () => {
  const { component } = await render(mod.Signup);
  await user.type(screen.getByLabelText('Password'), 'secret123');
  await user.type(screen.getByLabelText('Confirm password'), 'secret12');
  await stable();
  expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
  expect(component.form.hasError('passwordsMismatch')).toBe(true);
  await user.type(screen.getByLabelText('Confirm password'), '3');
  await stable();
  expect(screen.queryByText('Passwords do not match')).toBeNull();
});

test('"Add skill" appends required controls to the FormArray', async () => {
  const { component } = await render(mod.Signup);
  await user.type(screen.getByLabelText('Username'), 'ada');
  await user.type(screen.getByLabelText('Password'), 'secret123');
  await user.type(screen.getByLabelText('Confirm password'), 'secret123');
  await stable();
  expect(screen.getByRole('button', { name: 'Sign up' })).toBeEnabled();
  await user.click(screen.getByRole('button', { name: 'Add skill' }));
  await user.click(screen.getByRole('button', { name: 'Add skill' }));
  await stable();
  expect(screen.getByText('Skills (2)')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Sign up' })).toBeDisabled();
  await user.type(screen.getByLabelText('Skill 1'), 'Angular');
  await user.type(screen.getByLabelText('Skill 2'), 'TypeScript');
  await stable();
  expect(component.form.getRawValue().skills).toEqual(['Angular', 'TypeScript']);
  expect(screen.getByRole('button', { name: 'Sign up' })).toBeEnabled();
});
