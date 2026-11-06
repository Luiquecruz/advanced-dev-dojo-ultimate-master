const { provideHttpClient } = require('@angular/common/http');

const keyboard = { id: 1, name: 'Keyboard', price: 120, category: 'hardware' };
const articleOf = (name: string) => screen.getByRole('heading', { name }).closest('article')!;

// beginner mistake: a presentational component that injects HttpClient or a service ties itself to one screen and one back end
test('ProductCard renders the name and the formatted price and injects nothing', async () => {
  const cardSource = source.slice(source.indexOf('class ProductCard'), source.indexOf('class ProductsPage'));
  expect(cardSource).not.toMatch(/\binject\s*\(|\bHttpClient\b|constructor\s*\(/);
  await render(mod.ProductCard, { inputs: { product: keyboard } });
  expect(screen.getByRole('heading', { name: 'Keyboard' })).toBeInTheDocument();
  expect(screen.getByText('$120.00')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Add Keyboard' })).toBeInTheDocument();
});

test('ProductCard emits the product through its add output when the button is clicked', async () => {
  const { component } = await render(mod.ProductCard, { inputs: { product: keyboard } });
  const added = fn();
  component.add.subscribe(added);
  await user.click(screen.getByRole('button', { name: 'Add Keyboard' }));
  expect(added).toHaveBeenCalledTimes(1);
  expect(added).toHaveBeenCalledWith(keyboard);
});

test('ProductCard marks the article with the class selected only while the selected input is true', async () => {
  const { setInput } = await render(mod.ProductCard, { inputs: { product: keyboard } });
  expect(articleOf('Keyboard')).not.toHaveClass('selected');
  setInput('selected', true);
  await stable();
  expect(articleOf('Keyboard')).toHaveClass('selected');
});

test('ProductsPage loads the products and renders one card for each', async () => {
  await render(mod.ProductsPage, { providers: [provideHttpClient()] });
  await waitFor(() => expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(5));
  expect(screen.getByText('$199.00')).toBeInTheDocument();
  expect(screen.getByText('Cart: 0 item(s), total $0.00')).toBeInTheDocument();
});

test('adding products updates the cart summary and highlights their cards', async () => {
  await render(mod.ProductsPage, { providers: [provideHttpClient()] });
  await waitFor(() => expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(5));
  await user.click(screen.getByRole('button', { name: 'Add Keyboard' }));
  await user.click(screen.getByRole('button', { name: 'Add Mouse' }));
  await waitFor(() => expect(screen.getByText('Cart: 2 item(s), total $165.00')).toBeInTheDocument());
  expect(articleOf('Keyboard')).toHaveClass('selected');
  expect(articleOf('Mouse')).toHaveClass('selected');
  expect(articleOf('Monitor')).not.toHaveClass('selected');
});

test('adding the same product twice keeps one entry in the cart', async () => {
  await render(mod.ProductsPage, { providers: [provideHttpClient()] });
  await waitFor(() => expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(5));
  await user.click(screen.getByRole('button', { name: 'Add Monitor' }));
  await user.click(screen.getByRole('button', { name: 'Add Monitor' }));
  await waitFor(() => expect(screen.getByText('Cart: 1 item(s), total $340.00')).toBeInTheDocument());
});
