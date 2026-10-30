import { useEffect, useState } from 'react';
import { formatPrice } from '../../../shared/lib/formatPrice';
import { useCart } from '../../cart';
import { fetchProducts } from '../api/fetchProducts';

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
