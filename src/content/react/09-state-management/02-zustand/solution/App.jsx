import { selectCount, selectTotal, useCartStore } from './store';

const products = [
  { id: 1, name: 'Keyboard', price: 120 },
  { id: 2, name: 'Mouse', price: 45 },
  { id: 4, name: 'Monitor', price: 340 },
];

export function ProductList() {
  const addItem = useCartStore((state) => state.addItem);

  return (
    <ul>
      {products.map((product) => (
        <li key={product.id}>
          {product.name} (${product.price})
          <button onClick={() => addItem(product)}>Add {product.name}</button>
        </li>
      ))}
    </ul>
  );
}

export function CartSummary() {
  const count = useCartStore(selectCount);
  const total = useCartStore(selectTotal);
  const clear = useCartStore((state) => state.clear);

  return (
    <aside>
      <p data-testid="cart-count">Items: {count}</p>
      <p data-testid="cart-total">Total: ${total}</p>
      <button onClick={clear}>Clear cart</button>
    </aside>
  );
}

export default function App() {
  return (
    <main>
      <ProductList />
      <CartSummary />
    </main>
  );
}
