test('each label is associated with its input', () => {
  render(mod.default);
  expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
  expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
});

test('the two fields get different ids', () => {
  render(mod.default);
  const email = screen.getByLabelText('Email');
  const password = screen.getByLabelText('Password');
  expect(email.id).toBeTruthy();
  expect(email.id).not.toBe(password.id);
});

test('help text is linked with aria-describedby', () => {
  render(mod.default);
  const email = screen.getByLabelText('Email');
  const help = screen.getByText('We never share it');
  expect(help.id).toBe(`${email.id}-help`);
  expect(email).toHaveAttribute('aria-describedby', help.id);
  expect(screen.getByLabelText('Password')).not.toHaveAttribute('aria-describedby');
});

test('FormField is named "FormField" and keeps attributes off the wrapper', () => {
  const FormField = modules['FormField.vue'].default;
  expect(FormField.name).toBe('FormField');
  const wrapper = mount(FormField, { props: { label: 'Name' }, attrs: { placeholder: 'Ada' } });
  expect(wrapper.get('.form-field').attributes('placeholder')).toBeUndefined();
  expect(wrapper.get('input').attributes('placeholder')).toBe('Ada');
});

test('uses useId and defineOptions', () => {
  expect(sources['FormField.vue']).toMatch(/useId\s*\(\s*\)/);
  expect(sources['FormField.vue']).toMatch(/defineOptions\s*\(/);
});
