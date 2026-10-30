import { createSearchSchema } from '../../shared/url/createSearchSchema';

export const productSearchSchema = createSearchSchema({
  q: { type: 'string', default: '' },
  category: { type: 'list', values: ['hardware', 'software'], default: [] },
  sort: { type: 'enum', values: ['name', 'price'], default: 'name' },
  page: { type: 'number', default: 1, min: 1 },
});
