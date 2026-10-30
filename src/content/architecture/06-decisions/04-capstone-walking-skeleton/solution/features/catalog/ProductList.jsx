import { useState } from 'react';
import { filterProducts } from './filterProducts';

export function ProductList({ products }) {
  const [filterText, setFilterText] = useState('');
  const [cartProductIds, setCartProductIds] = useState([]);
  const visibleProducts = filterProducts(products, filterText);

  return (
    <section aria-labelledby="catalog-heading">
      <h2 id="catalog-heading">Catalog</h2>
      <label>
        Filter products
        <input value={filterText} onChange={(event) => setFilterText(event.target.value)} />
      </label>
      <ul aria-label="Products">
        {visibleProducts.map((product) => (
          <li key={product.id}>
            <span>{product.name}</span> <span>{product.priceLabel}</span>
            <button type="button" onClick={() => setCartProductIds((productIds) => [...productIds, product.id])}>
              Add {product.name} to cart
            </button>
          </li>
        ))}
      </ul>
      <p role="status">Cart items: {cartProductIds.length}</p>
    </section>
  );
}
