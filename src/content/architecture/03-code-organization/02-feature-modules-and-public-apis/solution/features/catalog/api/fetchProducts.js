export async function fetchProducts() {
  const response = await fetch('/api/products');
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}
