test('appUnless renders the paragraph while the condition is false', async () => {
  await render(mod.App);
  expect(screen.getAllByText('Now you see me')).toHaveLength(1);
});

test('appUnless removes and restores the paragraph without duplicates', async () => {
  await render(mod.App);
  const toggle = screen.getByRole('button', { name: 'Toggle' });
  await user.click(toggle);
  await stable();
  expect(screen.queryByText('Now you see me')).toBeNull();
  await user.click(toggle);
  await stable();
  expect(screen.getAllByText('Now you see me')).toHaveLength(1);
});

test('appTimes renders the template N times with index and count in the context', async () => {
  await render(mod.App);
  const items = screen.getAllByRole('listitem').map((item) => item.textContent.trim());
  expect(items).toEqual(['Item 1 of 3', 'Item 2 of 3', 'Item 3 of 3']);
});

test('appTimes re-renders when the number changes', async () => {
  await render(mod.App);
  await user.click(screen.getByRole('button', { name: 'More' }));
  await stable();
  const items = screen.getAllByRole('listitem').map((item) => item.textContent.trim());
  expect(items).toEqual(['Item 1 of 4', 'Item 2 of 4', 'Item 3 of 4', 'Item 4 of 4']);
});

test('the directives use TemplateRef and ViewContainerRef', () => {
  expect(source).toMatch(/inject(<[^>]*>)?\(\s*TemplateRef\s*\)/);
  expect(source).toMatch(/createEmbeddedView\(/);
});
