import { useEffect, useState } from 'react';
import { fetchProducts } from '../api/fetchProducts';
// TODO: import useCart from the cart feature's public API instead of its internals
import { useCart } from '../../cart/model/CartContext';

// TODO: this helper is duplicated in the cart feature: move it to shared/lib/formatPrice.js and import it from there
function formatPrice(amount) {
  return `$${amount.toFixed(2)}`;
}

export function ProductList() {
  const [products, setProducts] = useState(null);
  const { addItem } = useCart();

  useEffect(() => {
    let active = true;
    fetchProducts().then((data) => {
      if (active) setProducts(data);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!products) {
    return <p>Loading products...</p>;
  }

  return (
    <ul aria-label="Products">
      {products.map((product) => (
        <li key={product.id}>
          {product.name} {formatPrice(product.price)}
          <button onClick={() => addItem(product)}>Add {product.name}</button>
        </li>
      ))}
    </ul>
  );
}
