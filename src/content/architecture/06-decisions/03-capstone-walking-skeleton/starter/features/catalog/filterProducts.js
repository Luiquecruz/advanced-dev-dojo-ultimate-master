export function filterProducts(products, filterText) {
  const normalizedFilter = filterText.trim().toLowerCase();
  return products.filter((product) => product.name.toLowerCase().includes(normalizedFilter));
}
