export async function findProducts(query) {
  const response = await fetch(`/api/products?q=${encodeURIComponent(query)}`);
  return response.json();
}

export async function findProductById(id) {
  // TODO: the API has no detail endpoint: load every product and return the one with this id, or null
  return null;
}
