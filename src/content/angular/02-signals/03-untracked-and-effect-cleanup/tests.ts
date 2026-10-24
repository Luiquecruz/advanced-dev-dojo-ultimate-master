const draftInput = () => screen.getByRole('textbox', { name: 'Draft' });
const entries = () => screen.queryAllByRole('listitem').map((item) => item.textContent!.trim());

test('saves the draft after the delay', async () => {
  await render(mod.AutoSave);
  await user.type(draftInput(), 'Hi');
  await stable();
  await sleep(300);
  await stable();
  expect(entries()).toEqual(['Ada: Hi']);
});

test('debounces fast typing into a single save', async () => {
  const { component } = await render(mod.AutoSave);
  await user.type(draftInput(), 'Hello');
  await stable();
  await sleep(300);
  expect(component.saved()).toEqual(['Ada: Hello']);
});

test('changing only the author does not trigger a save', async () => {
  const { component, stable } = await render(mod.AutoSave);
  await user.type(draftInput(), 'Hi');
  await stable();
  await sleep(250);
  component.author.set('Grace');
  await stable();
  await sleep(250);
  expect(component.saved()).toEqual(['Ada: Hi']);
  await user.type(draftInput(), '!');
  await stable();
  await sleep(250);
  expect(component.saved()).toEqual(['Ada: Hi', 'Grace: Hi!']);
});

test('cancels the pending save when the component is destroyed', async () => {
  const { fixture, component } = await render(mod.AutoSave);
  await user.type(draftInput(), 'Bye');
  await stable();
  fixture.destroy();
  await sleep(250);
  expect(component.saved()).toEqual([]);
});

test('uses untracked() and onCleanup', () => {
  expect(source).toMatch(/untracked\(/);
  expect(source).toMatch(/onCleanup\(/);
  expect(source).toMatch(/effect\(/);
});
