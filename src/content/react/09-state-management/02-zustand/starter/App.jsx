import { selectCount, selectTotal, useCartStore } from './store';

const products = [
  { id: 1, name: 'Keyboard', price: 120 },
  { id: 2, name: 'Mouse', price: 45 },
  { id: 4, name: 'Monitor', price: 340 },
];

export function ProductList() {
  // TODO: select the addItem action from useCartStore

  return (
    <ul>
      {products.map((product) => (
        <li key={product.id}>
          {product.name} (${product.price})
          {/* TODO: call addItem(product) on click */}
          <button>Add {product.name}</button>
        </li>
      ))}
    </ul>
  );
}

export function CartSummary() {
  // TODO: read the count and total with selectCount / selectTotal, and select the clear action
  const count = 0;
  const total = 0;

  return (
    <aside>
      <p data-testid="cart-count">Items: {count}</p>
      <p data-testid="cart-total">Total: ${total}</p>
      <button>Clear cart</button>
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
