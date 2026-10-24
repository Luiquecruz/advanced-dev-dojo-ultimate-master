const text = (element: HTMLElement, selector: string) => element.querySelector(selector)!.textContent!.trim();

test('derives count, subtotal, tax and total', async () => {
  const { element } = await render(mod.Cart);
  expect(text(element, '.count')).toBe('Items: 3');
  expect(text(element, '.subtotal')).toBe('Subtotal: $210.00');
  expect(text(element, '.tax')).toBe('Tax: $21.00');
  expect(text(element, '.total')).toBe('Total: $231.00');
});

test('add() increments an existing item with a new array', async () => {
  const { element, component } = await render(mod.Cart);
  const before = component.items();
  await user.click(screen.getByRole('button', { name: 'Add mouse' }));
  await stable();
  expect(component.items()).not.toBe(before);
  expect(component.items()).toHaveLength(2);
  expect(text(element, '.count')).toBe('Items: 4');
  expect(text(element, '.total')).toBe('Total: $280.50');
});

test('add() appends a new item and remove() deletes it', async () => {
  const { element } = await render(mod.Cart);
  await user.click(screen.getByRole('button', { name: 'Add monitor' }));
  await stable();
  expect(screen.getAllByRole('listitem')).toHaveLength(3);
  expect(text(element, '.subtotal')).toBe('Subtotal: $550.00');
  await user.click(screen.getByRole('button', { name: 'Remove Keyboard' }));
  await stable();
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
  expect(text(element, '.subtotal')).toBe('Subtotal: $430.00');
});

test('recomputes when taxRate changes', async () => {
  const { element, component, stable } = await render(mod.Cart);
  component.taxRate.set(0.2);
  await stable();
  expect(text(element, '.tax')).toBe('Tax: $42.00');
  expect(component.total()).toBe(252);
});

test('effect syncs document.title and localStorage', async () => {
  localStorage.clear();
  await render(mod.Cart);
  expect(document.title).toBe('Cart (3)');
  await user.click(screen.getByRole('button', { name: 'Add monitor' }));
  await stable();
  expect(document.title).toBe('Cart (4)');
  expect(JSON.parse(localStorage.getItem('cart')!).map((item: any) => item.name)).toEqual(['Keyboard', 'Mouse', 'Monitor']);
});

test('uses computed() and effect()', () => {
  expect(source).toMatch(/total\s*=\s*computed\(/);
  expect(source).toMatch(/subtotal\s*=\s*computed\(/);
  expect(source).toMatch(/effect\(/);
});
