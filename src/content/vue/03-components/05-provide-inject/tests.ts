const ThemedPanel = modules['ThemedPanel.vue'].default;
const ThemeToggle = modules['ThemeToggle.vue'].default;
const { ThemeKey } = modules['keys.ts'];

test('ThemedPanel falls back to the light theme without a provider', () => {
  const wrapper = mount(ThemedPanel, { slots: { default: 'Content' } });
  expect(wrapper.get('section').classes()).toEqual(['panel', 'light']);
  expect(wrapper.text()).toBe('Content');
});

test('ThemeToggle reads the injected theme and calls toggle', async () => {
  const { ref } = require('vue');
  const toggle = fn();
  const wrapper = mount(ThemeToggle, { global: { provide: { [ThemeKey]: { theme: ref('dark'), toggle } } } });
  expect(wrapper.get('button').text()).toBe('Switch to light');
  await wrapper.get('button').trigger('click');
  expect(toggle).toHaveBeenCalled();
});

test('App starts in light mode', () => {
  render(mod.default);
  expect(screen.getByRole('button')).toHaveTextContent('Switch to dark');
  expect(document.querySelector('section')).toHaveClass('panel', 'light');
});

test('clicking the toggle switches every consumer to dark and back', async () => {
  render(mod.default);
  await user.click(screen.getByRole('button'));
  expect(document.querySelector('section')).toHaveClass('dark');
  expect(screen.getByRole('button')).toHaveTextContent('Switch to light');
  await user.click(screen.getByRole('button'));
  expect(document.querySelector('section')).toHaveClass('light');
});

test('App provides with ThemeKey and readonly state', () => {
  expect(sources['App.vue']).toMatch(/provide\s*\(\s*ThemeKey/);
  expect(sources['App.vue']).toMatch(/readonly\s*\(/);
});
