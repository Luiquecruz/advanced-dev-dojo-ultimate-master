test('renders "Hello, Vue!" in an <h1>', () => {
  const wrapper = mount(mod.default);
  expect(wrapper.get('h1').text()).toBe('Hello, Vue!');
});

test('starts the button at "Clicked 0 times"', () => {
  const wrapper = mount(mod.default);
  expect(wrapper.get('button').text()).toBe('Clicked 0 times');
});

test('increments the counter on click', async () => {
  render(mod.default);
  await user.click(screen.getByRole('button'));
  await user.click(screen.getByRole('button'));
  expect(screen.getByRole('button')).toHaveTextContent('Clicked 2 times');
});

test('uses interpolation for name', () => {
  expect(source).toMatch(/\{\{\s*name\s*\}\}/);
});
