import { products } from './products';

export function CatalogPage({ events }) {
  return (
    <section>
      <h2>Catalog</h2>
      <ul aria-label="Products">
        {products.map((product) => (
          <li key={product.id}>
            {product.name} (${product.price}){' '}
            <button type="button" onClick={() => events.emit('cart:add', product)}>
              Add {product.name}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
