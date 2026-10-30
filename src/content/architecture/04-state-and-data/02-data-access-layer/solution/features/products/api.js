import { queryOptions } from '@tanstack/react-query';
import { apiGet } from '../../shared/api/client';

export const productQueries = {
  all: () => queryOptions({ queryKey: ['products'] }),
  list: (searchTerm) =>
    queryOptions({
      queryKey: [...productQueries.all().queryKey, 'list', { search: searchTerm }],
      queryFn: () => apiGet(`/products?q=${encodeURIComponent(searchTerm)}`),
      staleTime: 30_000,
    }),
  detail: (id) =>
    queryOptions({
      queryKey: [...productQueries.all().queryKey, 'detail', id],
      queryFn: () => apiGet(`/products/${id}`),
      staleTime: 30_000,
    }),
};
