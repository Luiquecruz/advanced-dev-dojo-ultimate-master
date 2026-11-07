import { queryOptions } from '@tanstack/react-query';

export async function fetchProducts(q) {
  const response = await fetch(`/api/products?q=${encodeURIComponent(q)}`);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
}

// TODO: search(q) -> ['products', q]
export const productKeys = {
  all: ['products'],
  search: (q) => [...productKeys.all],
};

export const productsQueryOptions = (q) =>
  queryOptions({
    queryKey: productKeys.search(q),
    queryFn: () => fetchProducts(q),
    staleTime: 30_000,
  });
