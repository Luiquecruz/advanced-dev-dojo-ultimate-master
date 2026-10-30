import { products } from './products';
import { cartStore } from '../cart/cartStore';

export function CatalogPage({ events }) {
  return (
    <section>
      <h2>Catalog</h2>
      <ul aria-label="Products">
        {products.map((product) => (
          <li key={product.id}>
            {product.name} (${product.price}){' '}
            {/* TODO: stop importing the cart module: emit 'cart:add' with the product on events instead */}
            <button type="button" onClick={() => cartStore.add(product)}>
              Add {product.name}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
