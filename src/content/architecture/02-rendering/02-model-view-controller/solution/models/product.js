export async function findProducts(query) {
  const response = await fetch(`/api/products?q=${encodeURIComponent(query)}`);
  return response.json();
}

export async function findProductById(id) {
  const products = await findProducts('');
  return products.find((product) => product.id === Number(id)) ?? null;
}
