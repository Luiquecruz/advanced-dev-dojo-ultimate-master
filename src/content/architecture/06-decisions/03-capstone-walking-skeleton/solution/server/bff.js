const priceFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export async function getCatalogViewModel() {
  const response = await fetch('/api/products');
  if (!response.ok) {
    throw new Error(`Products service responded with ${response.status}`);
  }
  const products = await response.json();
  return {
    products: products.map((product) => ({
      id: product.id,
      name: product.name,
      priceLabel: priceFormatter.format(product.price),
    })),
    count: products.length,
  };
}
