test('each label points to its own input', async () => {
  const SignupForm = mod.default;
  render(<SignupForm />);
  const email = screen.getByLabelText('Email');
  const backup = screen.getByLabelText('Backup email');
  expect(email).not.toBe(backup);
  await user.type(backup, 'ada@example.com');
  expect(backup).toHaveValue('ada@example.com');
  expect(email).toHaveValue('');
});

test('every id in the form is unique', () => {
  const SignupForm = mod.default;
  const { container } = render(<SignupForm />);
  const ids = [...container.querySelectorAll('[id]')].map((element) => element.id);
  expect(ids).toHaveLength(4);
  expect(new Set(ids).size).toBe(4);
});

test('aria-describedby links each input to its own hint', () => {
  const SignupForm = mod.default;
  render(<SignupForm />);
  const backup = screen.getByLabelText('Backup email');
  const hint = document.getElementById(backup.getAttribute('aria-describedby'));
  expect(hint).toHaveTextContent('Used to recover your account.');
});

test('ids stay the same across re-renders', () => {
  const { FormField } = mod;
  const { rerender } = render(<FormField label="Name" hint="Your full name." />);
  const before = screen.getByLabelText('Name').id;
  rerender(<FormField label="Name" hint="Your full name, please." />);
  expect(screen.getByLabelText('Name').id).toBe(before);
});

test('uses useId instead of hard-coded or random ids', () => {
  expect(source).toMatch(/useId\s*\(/);
  expect(source).not.toMatch(/Math\.random/);
});
