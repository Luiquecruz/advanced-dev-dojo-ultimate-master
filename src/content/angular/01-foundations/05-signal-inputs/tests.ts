const PriceTag = modules['price-tag.ts'].PriceTag;

test('renders the label and the price with the default currency', async () => {
  const { element } = await render(PriceTag, { inputs: { label: 'Mouse', amount: 45 } });
  expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Mouse');
  expect(element.querySelector('.price')).toHaveTextContent('USD 45.00');
  expect(element.querySelector('.original')).toBeNull();
});

test('uses the currency input when provided', async () => {
  const { element } = await render(PriceTag, { inputs: { label: 'Mouse', amount: 45, currency: 'EUR' } });
  expect(element.querySelector('.price')).toHaveTextContent('EUR 45.00');
});

test('applies the discount and shows the original price', async () => {
  const { element } = await render(PriceTag, { inputs: { label: 'Keyboard', amount: 120, discount: 25 } });
  expect(element.querySelector('.price')).toHaveTextContent('USD 90.00');
  expect(element.querySelector('s.original')).toHaveTextContent('USD 120.00');
});

test('reacts when the parent changes an input', async () => {
  const { element, setInput } = await render(PriceTag, { inputs: { label: 'Monitor', amount: 340 } });
  await setInput('amount', 300);
  await setInput('discount', 10);
  expect(element.querySelector('.price')).toHaveTextContent('USD 270.00');
});

test('transforms static attributes and sets the host class', async () => {
  const { element } = await render(mod.App);
  const [keyboard, mouse] = [...element.querySelectorAll('app-price-tag')];
  expect(keyboard.querySelector('.price')).toHaveTextContent('USD 90.00');
  expect(keyboard).toHaveClass('highlighted');
  expect(mouse.querySelector('.price')).toHaveTextContent('EUR 45.00');
  expect(mouse).not.toHaveClass('highlighted');
});

test('declares signal inputs with input.required and transforms', () => {
  const code = sources['price-tag.ts'];
  expect(code).toMatch(/label\s*=\s*input\.required/);
  expect(code).toMatch(/amount\s*=\s*input\.required/);
  expect(code).toMatch(/numberAttribute/);
  expect(code).toMatch(/booleanAttribute/);
  expect(code).not.toMatch(/@Input\(/);
});
