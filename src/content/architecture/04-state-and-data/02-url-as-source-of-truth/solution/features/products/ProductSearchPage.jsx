import { useSearchState } from '../../shared/url/useSearchState';
import { productSearchSchema } from './searchSchema';

export const PAGE_SIZE = 2;

const PRODUCTS = [
  { id: 1, name: 'Keyboard', price: 120, category: 'hardware' },
  { id: 2, name: 'Mouse', price: 45, category: 'hardware' },
  { id: 3, name: 'IDE License', price: 199, category: 'software' },
  { id: 4, name: 'Monitor', price: 340, category: 'hardware' },
  { id: 5, name: 'Cloud Credits', price: 50, category: 'software' },
];

const CATEGORIES = [
  { value: 'hardware', label: 'Hardware' },
  { value: 'software', label: 'Software' },
];

function compareProducts(sort) {
  return sort === 'price' ? (first, second) => first.price - second.price : (first, second) => first.name.localeCompare(second.name);
}

export function ProductSearchPage() {
  const [search, setSearch] = useSearchState(productSearchSchema);

  const matchingProducts = PRODUCTS.filter(
    (product) =>
      product.name.toLowerCase().includes(search.q.toLowerCase()) &&
      (search.category.length === 0 || search.category.includes(product.category)),
  ).sort(compareProducts(search.sort));
  const pageCount = Math.max(1, Math.ceil(matchingProducts.length / PAGE_SIZE));
  const currentPage = Math.min(search.page, pageCount);
  const visibleProducts = matchingProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function toggleCategory(category) {
    const nextCategories = search.category.includes(category)
      ? search.category.filter((selected) => selected !== category)
      : [...search.category, category];
    setSearch({ category: nextCategories });
  }

  return (
    <section>
      <h1>Products</h1>
      <label>
        Search
        <input value={search.q} onChange={(event) => setSearch({ q: event.target.value }, { replace: true })} />
      </label>
      <fieldset>
        <legend>Category</legend>
        {CATEGORIES.map((category) => (
          <label key={category.value}>
            <input
              type="checkbox"
              checked={search.category.includes(category.value)}
              onChange={() => toggleCategory(category.value)}
            />
            {category.label}
          </label>
        ))}
      </fieldset>
      <label>
        Sort by
        <select value={search.sort} onChange={(event) => setSearch({ sort: event.target.value })}>
          <option value="name">Name</option>
          <option value="price">Price</option>
        </select>
      </label>
      <ul aria-label="Products">
        {visibleProducts.map((product) => (
          <li key={product.id}>
            {product.name} (${product.price})
          </li>
        ))}
      </ul>
      <nav aria-label="Pagination">
        <button type="button" disabled={currentPage <= 1} onClick={() => setSearch({ page: currentPage - 1 })}>
          Previous page
        </button>
        <p>
          Page {currentPage} of {pageCount}
        </p>
        <button type="button" disabled={currentPage >= pageCount} onClick={() => setSearch({ page: currentPage + 1 })}>
          Next page
        </button>
      </nav>
    </section>
  );
}
