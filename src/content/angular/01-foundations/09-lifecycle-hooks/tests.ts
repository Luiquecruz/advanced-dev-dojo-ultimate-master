const changeItems = () => screen.queryAllByRole('listitem').map((item) => item.textContent!.trim());

test('starts the timer with the bound intervalMs', async () => {
  const { element, stable } = await render(mod.AutoRefresh, { inputs: { intervalMs: 40 } });
  await sleep(150);
  await stable();
  const ticks = Number(element.querySelector('.ticks')!.textContent!.replace(/\D/g, ''));
  expect(ticks).toBeGreaterThanOrEqual(2);
});

test('stops the timer when the component is destroyed', async () => {
  const { fixture, component } = await render(mod.AutoRefresh, { inputs: { intervalMs: 30 } });
  await sleep(80);
  fixture.destroy();
  const ticksAtDestroy = component.ticks();
  expect(ticksAtDestroy).toBeGreaterThanOrEqual(1);
  await sleep(120);
  expect(component.ticks()).toBe(ticksAtDestroy);
});

test('records label changes after the first binding', async () => {
  const { setInput } = await render(mod.AutoRefresh, { inputs: { label: 'Feed', intervalMs: 5000 } });
  expect(changeItems()).toEqual([]);
  await setInput('label', 'News');
  await setInput('label', 'Sports');
  expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Sports');
  expect(changeItems()).toEqual(['label: Feed → News', 'label: News → Sports']);
});

test('focuses the filter input after the first render', async () => {
  await render(mod.AutoRefresh, { inputs: { intervalMs: 5000 } });
  await stable();
  expect(screen.getByRole('textbox', { name: 'Filter' })).toHaveFocus();
});

test('uses ngOnInit, ngOnChanges and afterNextRender', () => {
  expect(source).toMatch(/ngOnInit\s*\(/);
  expect(source).toMatch(/ngOnChanges\s*\(/);
  expect(source).toMatch(/afterNextRender\s*\(/);
});
