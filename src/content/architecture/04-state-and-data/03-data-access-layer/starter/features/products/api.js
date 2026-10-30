import { queryOptions } from '@tanstack/react-query';
import { apiGet } from '../../shared/api/client';

export const productQueries = {
  all: () => {
    // TODO: return queryOptions with the root key ['products']
  },
  list: (searchTerm) => {
    // TODO: return queryOptions keyed under all().queryKey that loads /products?q={searchTerm} with apiGet
  },
  detail: (id) => {
    // TODO: return queryOptions keyed under all().queryKey that loads /products/{id} with apiGet
  },
};
