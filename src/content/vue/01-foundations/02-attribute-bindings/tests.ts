test('binds src and alt on the <img>', () => {
  const wrapper = mount(mod.default);
  const image = wrapper.get('img');
  expect(image.attributes('src')).toBe('/img/ada.png');
  expect(image.attributes('alt')).toBe('Ada Lovelace');
});

test('gives the <section> the id "profile-ada" with the same-name shorthand', () => {
  const wrapper = mount(mod.default);
  expect(wrapper.get('section').attributes('id')).toBe('profile-ada');
  expect(source).toMatch(/<section[^>]*\s:id(?=[\s>\/])(?!\s*=)/);
});

test('disables "Save" while busy', () => {
  render(mod.default);
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
});

test('enables "Save" after clicking "Finish"', async () => {
  render(mod.default);
  await user.click(screen.getByRole('button', { name: 'Finish' }));
  expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
});

test('spreads the link object onto the <a>', () => {
  const wrapper = mount(mod.default);
  const anchor = wrapper.get('a');
  expect(anchor.attributes('href')).toBe('https://vuejs.org');
  expect(anchor.attributes('target')).toBe('_blank');
  expect(source).toMatch(/v-bind\s*=\s*"\s*link\s*"/);
});
