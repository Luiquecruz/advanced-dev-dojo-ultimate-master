export async function findProducts(query) {
  const response = await fetch(`/api/products?q=${encodeURIComponent(query)}`);
  return response.json();
}

export async function findProductById(id) {
  // TODO: reuse findProducts('') and return the product with this id, or null
  return null;
}
