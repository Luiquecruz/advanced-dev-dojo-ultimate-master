test('"Focus search" focuses the input inside SearchBox', async () => {
  render(mod.default);
  const input = screen.getByRole('searchbox', { name: 'Search' });
  await user.click(screen.getByRole('button', { name: 'Focus search' }));
  expect(input).toHaveFocus();
});

test('"Clear" empties the query and focuses the input', async () => {
  render(mod.default);
  const input = screen.getByRole('searchbox', { name: 'Search' });
  await user.type(input, 'vue');
  await user.click(screen.getByRole('button', { name: 'Clear' }));
  expect(input).toHaveValue('');
  expect(input).toHaveFocus();
});

test('SearchBox exposes focus and clear to template refs', () => {
  const { h, ref } = require('vue');
  const child = ref(null);
  const Host = { setup: () => () => h(modules['SearchBox.vue'].default, { ref: child }) };
  mount(Host);
  expect(typeof child.value.focus).toBe('function');
  expect(typeof child.value.clear).toBe('function');
});

test('uses useTemplateRef in both components and defineExpose in SearchBox', () => {
  expect(sources['SearchBox.vue']).toMatch(/useTemplateRef\s*(<[^>]*>)?\s*\(/);
  expect(sources['App.vue']).toMatch(/useTemplateRef\b[^;]*\(\s*['"]search['"]/);
  expect(sources['SearchBox.vue']).toMatch(/defineExpose\s*\(/);
});
