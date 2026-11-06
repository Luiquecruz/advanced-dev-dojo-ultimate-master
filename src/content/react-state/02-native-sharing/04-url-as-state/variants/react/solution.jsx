import { MemoryRouter, useLocation, useSearchParams } from 'react-router';

export const products = [
  { id: 1, name: 'Keyboard', price: 120, category: 'hardware' },
  { id: 2, name: 'Mouse', price: 45, category: 'hardware' },
  { id: 3, name: 'Monitor', price: 340, category: 'hardware' },
  { id: 4, name: 'IDE License', price: 199, category: 'software' },
  { id: 5, name: 'Cloud Credits', price: 50, category: 'software' },
];

const CATEGORIES = ['all', 'hardware', 'software'];
const SORTS = ['name', 'price-asc', 'price-desc'];
const DEFAULTS = { q: '', category: 'all', sort: 'name' };

export function parseFilters(searchParams) {
  const category = searchParams.get('category');
  const sort = searchParams.get('sort');
  return {
    q: searchParams.get('q') ?? DEFAULTS.q,
    category: CATEGORIES.includes(category) ? category : DEFAULTS.category,
    sort: SORTS.includes(sort) ? sort : DEFAULTS.sort,
  };
}

const comparators = {
  name: (a, b) => a.name.localeCompare(b.name),
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
};

export function ProductCatalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { q, category, sort } = parseFilters(searchParams);

  function updateFilter(key, value, options) {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value === DEFAULTS[key]) next.delete(key);
      else next.set(key, value);
      return next;
    }, options);
  }

  const visible = products
    .filter((product) => category === 'all' || product.category === category)
    .filter((product) => product.name.toLowerCase().includes(q.toLowerCase()))
    .toSorted(comparators[sort]);

  return (
    <section>
      <input aria-label="Search" value={q} onChange={(event) => updateFilter('q', event.target.value, { replace: true })} />
      <select aria-label="Category" value={category} onChange={(event) => updateFilter('category', event.target.value)}>
        <option value="all">All</option>
        <option value="hardware">Hardware</option>
        <option value="software">Software</option>
      </select>
      <select aria-label="Sort by" value={sort} onChange={(event) => updateFilter('sort', event.target.value)}>
        <option value="name">Name</option>
        <option value="price-asc">Price: low to high</option>
        <option value="price-desc">Price: high to low</option>
      </select>
      <button onClick={() => setSearchParams({})}>Clear filters</button>
      <p data-testid="result-count">{visible.length} products</p>
      <ul>
        {visible.map((product) => (
          <li key={product.id}>{product.name}</li>
        ))}
      </ul>
    </section>
  );
}

function LocationBar() {
  const location = useLocation();
  return <code>{location.pathname + location.search}</code>;
}

export default function App() {
  return (
    <MemoryRouter initialEntries={['/products?category=hardware']}>
      <LocationBar />
      <ProductCatalog />
    </MemoryRouter>
  );
}
