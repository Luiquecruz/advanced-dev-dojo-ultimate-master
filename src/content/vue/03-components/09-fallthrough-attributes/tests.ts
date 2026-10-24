const BaseButton = modules['BaseButton.vue'].default;
const BaseInput = modules['BaseInput.vue'].default;

test('BaseButton merges the parent class and forwards attributes', () => {
  const wrapper = mount(BaseButton, { attrs: { class: 'primary', type: 'submit' }, slots: { default: 'Save' } });
  const button = wrapper.get('button');
  expect(button.classes()).toEqual(['btn', 'primary']);
  expect(button.attributes('type')).toBe('submit');
  expect(button.text()).toBe('Save');
});

test('BaseButton forwards click listeners to the native button', async () => {
  const onClick = fn();
  const wrapper = mount(BaseButton, { attrs: { onClick } });
  await wrapper.get('button').trigger('click');
  expect(onClick).toHaveBeenCalledTimes(1);
});

test('BaseInput puts attributes on the <input>, not on the <label>', () => {
  const wrapper = mount(BaseInput, { props: { label: 'Email' }, attrs: { placeholder: 'you@example.com', class: 'wide', 'data-testid': 'email' } });
  const label = wrapper.get('label');
  const input = wrapper.get('input');
  expect(label.attributes('placeholder')).toBeUndefined();
  expect(label.classes()).toEqual(['field']);
  expect(input.attributes('placeholder')).toBe('you@example.com');
  expect(input.attributes('data-testid')).toBe('email');
  expect(input.classes()).toContain('wide');
});

test('App: v-model reaches the inner input and the form submits', async () => {
  render(mod.default);
  const input = screen.getByLabelText('Email');
  expect(input).toHaveAttribute('type', 'email');
  await user.type(input, 'ada@example.com');
  await user.click(screen.getByRole('button', { name: 'Subscribe' }));
  expect(screen.getByText('Subscribed ada@example.com')).toBeInTheDocument();
});

test('BaseInput disables inheritAttrs with defineOptions', () => {
  expect(sources['BaseInput.vue']).toMatch(/defineOptions\s*\(\s*\{[^}]*inheritAttrs\s*:\s*false/);
});
