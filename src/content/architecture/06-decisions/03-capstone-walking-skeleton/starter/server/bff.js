const priceFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export async function getCatalogViewModel() {
  // TODO: throw when the response is not ok
  const response = await fetch('/api/products');
  const products = await response.json();
  // TODO: keep only id, name and priceLabel (priceFormatter.format(price)) and add count
  return { products };
}
