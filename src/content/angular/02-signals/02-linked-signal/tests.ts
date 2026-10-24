const VariantPicker = modules['variant-picker.ts'].VariantPicker;
const tshirt = { name: 'T-Shirt', sizes: ['S', 'M', 'L', 'XL'], minQuantity: 1 };
const hoodie = { name: 'Hoodie', sizes: ['M', 'L', 'XL'], minQuantity: 1 };
const socks = { name: 'Socks', sizes: ['One size'], minQuantity: 2 };
const selection = (element: HTMLElement) => element.querySelector('.selection')!.textContent!.trim();

test('selects the first size and the minimum quantity initially', async () => {
  const { element } = await render(VariantPicker, { inputs: { product: socks } });
  expect(selection(element)).toBe('Size: One size · Qty: 2');
});

test('the selection is writable', async () => {
  const { element } = await render(VariantPicker, { inputs: { product: tshirt } });
  await user.click(screen.getByRole('button', { name: 'L' }));
  await user.click(screen.getByRole('button', { name: 'More' }));
  await stable();
  expect(selection(element)).toBe('Size: L · Qty: 2');
  expect(screen.getByRole('button', { name: 'L' })).toHaveAttribute('aria-pressed', 'true');
});

test('keeps the chosen size when the new product has it', async () => {
  const { element, setInput } = await render(VariantPicker, { inputs: { product: tshirt } });
  await user.click(screen.getByRole('button', { name: 'XL' }));
  await stable();
  await setInput('product', hoodie);
  expect(selection(element)).toMatch(/^Size: XL/);
});

test('falls back to the first size and resets the quantity', async () => {
  const { element, setInput } = await render(VariantPicker, { inputs: { product: tshirt } });
  await user.click(screen.getByRole('button', { name: 'S' }));
  await user.click(screen.getByRole('button', { name: 'More' }));
  await user.click(screen.getByRole('button', { name: 'More' }));
  await stable();
  expect(selection(element)).toBe('Size: S · Qty: 3');
  await setInput('product', hoodie);
  expect(selection(element)).toBe('Size: M · Qty: 1');
});

test('works inside App when switching products', async () => {
  const { element } = await render(mod.App);
  await user.click(screen.getByRole('button', { name: 'L' }));
  await user.click(screen.getByRole('button', { name: 'Show Hoodie' }));
  await stable();
  expect(selection(element)).toBe('Size: L · Qty: 1');
  await user.click(screen.getByRole('button', { name: 'Show Socks' }));
  await stable();
  expect(selection(element)).toBe('Size: One size · Qty: 2');
});

test('uses linkedSignal with source and computation', () => {
  const code = sources['variant-picker.ts'];
  expect(code).toMatch(/selectedSize\s*=\s*linkedSignal/);
  expect(code).toMatch(/source\s*:/);
  expect(code).toMatch(/computation\s*:/);
  expect(code).toMatch(/quantity\s*=\s*linkedSignal\(/);
});
