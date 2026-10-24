const sample = [
  { id: 1, name: 'Keyboard', price: 120, category: 'hardware' },
  { id: 2, name: 'Mouse', price: 45, category: 'hardware' },
  { id: 3, name: 'IDE License', price: 199, category: 'software' },
  { id: 5, name: 'Cloud Credits', price: 50, category: 'software' },
];
const items = () => screen.getAllByRole('listitem').map((item) => item.textContent.replace(/\s+/g, ' ').trim());

test('renders every product as "Name: $price" when maxPrice is not passed', () => {
  const ProductList = mod.default;
  render(<ProductList products={sample} />);
  expect(items()).toHaveLength(4);
  expect(items()).toContain('Keyboard: $120');
  expect(items()).toContain('IDE License: $199');
});

test('sorts the visible products by price, ascending', () => {
  const ProductList = mod.default;
  render(<ProductList products={sample} />);
  expect(items()).toEqual(['Mouse: $45', 'Cloud Credits: $50', 'Keyboard: $120', 'IDE License: $199']);
});

test('keeps only products with price <= maxPrice', () => {
  const ProductList = mod.default;
  render(<ProductList products={sample} maxPrice={120} />);
  expect(items()).toEqual(['Mouse: $45', 'Cloud Credits: $50', 'Keyboard: $120']);
});

test('shows "No products found." when nothing matches', () => {
  const ProductList = mod.default;
  const { container } = render(<ProductList products={sample} maxPrice={10} />);
  expect(screen.getByText('No products found.')).toBeInTheDocument();
  expect(container.querySelector('ul')).toBeNull();
});

test('does not mutate the products prop', () => {
  const ProductList = mod.default;
  const input = sample.map((product) => ({ ...product }));
  render(<ProductList products={input} />);
  expect(input.map((product) => product.id)).toEqual([1, 2, 3, 5]);
});

test('uses the product id as key', () => {
  expect(source).toMatch(/key=\{\s*\w+\.id\s*\}/);
  expect(source).not.toMatch(/key=\{\s*(index|i|idx)\s*\}/);
});
