test('starts with only "Nothing saved yet"', () => {
  const wrapper = mount(mod.default);
  const paragraphs = wrapper.findAll('p');
  expect(paragraphs).toHaveLength(1);
  expect(paragraphs[0].text()).toBe('Nothing saved yet');
});

test('shows "Loading..." and then "Saved!" as the status changes', async () => {
  render(mod.default);
  await user.click(screen.getByRole('button', { name: 'Load' }));
  expect(screen.getByText('Loading...')).toBeInTheDocument();
  expect(screen.queryByText('Nothing saved yet')).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Succeed' }));
  expect(screen.getByText('Saved!')).toBeInTheDocument();
  expect(screen.queryByText('Loading...')).toBeNull();
});

test('renders the error as role="alert" and removes it on success', async () => {
  render(mod.default);
  await user.click(screen.getByRole('button', { name: 'Fail' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
  await user.click(screen.getByRole('button', { name: 'Succeed' }));
  expect(screen.queryByRole('alert')).toBeNull();
});

test('keeps the help <aside> in the DOM but hidden until toggled (v-show)', async () => {
  const wrapper = mount(mod.default);
  const aside = wrapper.get('aside');
  expect(aside.text()).toBe('Press ? for shortcuts');
  expect((aside.element as HTMLElement).style.display).toBe('none');
  await wrapper.findAll('button').find((button) => button.text() === 'Toggle help')!.trigger('click');
  expect((wrapper.get('aside').element as HTMLElement).style.display).toBe('');
  expect(source).toMatch(/<aside[^>]*v-show/);
});

test('uses a v-else-if chain', () => {
  expect(source).toMatch(/v-else-if/);
  expect(source).toMatch(/v-else(?!-)/);
});
