import { createContext, use, useReducer, useState } from 'react';

export const products = [
  { id: 1, name: 'Keyboard', price: 120 },
  { id: 2, name: 'Mouse', price: 45 },
  { id: 3, name: 'Monitor', price: 340 },
];

// TODO: split this context by concern (user, cart) and separate the cart actions
const ShopContext = createContext(null);

function cartReducer(items, action) {
  switch (action.type) {
    case 'added': {
      const existing = items.find((item) => item.id === action.product.id);
      if (existing) {
        return items.map((item) => (item.id === action.product.id ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [...items, { ...action.product, quantity: 1 }];
    }
    case 'removed':
      return items.filter((item) => item.id !== action.id);
    case 'cleared':
      return [];
    default:
      throw new Error(`Unknown action: ${action.type}`);
  }
}

export function ShopProvider({ children, initialUser = { name: 'Ada' } }) {
  const [user, setUser] = useState(initialUser);
  const [items, dispatch] = useReducer(cartReducer, []);

  // TODO: memoize each value and compute count and total once, here
  const value = {
    user,
    signIn: (name) => setUser({ name }),
    signOut: () => setUser(null),
    items,
    addItem: (product) => dispatch({ type: 'added', product }),
    removeItem: (id) => dispatch({ type: 'removed', id }),
    clear: () => dispatch({ type: 'cleared' }),
  };

  return <ShopContext value={value}>{children}</ShopContext>;
}

function useShop(hookName) {
  const value = use(ShopContext);
  if (value === null) {
    throw new Error(`${hookName} must be used within a ShopProvider`);
  }
  return value;
}

// TODO: make each hook read only its own context
export function useUser() {
  const { user, signIn, signOut } = useShop('useUser');
  return { user, signIn, signOut };
}

export function useCart() {
  const { items } = useShop('useCart');
  return {
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  };
}

export function useCartActions() {
  const { addItem, removeItem, clear } = useShop('useCartActions');
  return { addItem, removeItem, clear };
}

export function UserBadge() {
  const { user, signOut } = useUser();
  return (
    <p>
      {user ? user.name : 'Guest'}
      {user && <button onClick={signOut}>Sign out</button>}
    </p>
  );
}

export function CartSummary() {
  const { count, total } = useCart();
  return <p data-testid="cart">Cart: {count} items (${total})</p>;
}

export function ProductCard({ product }) {
  const { addItem } = useCartActions();
  return (
    <li>
      {product.name}
      <button onClick={() => addItem(product)}>Add {product.name}</button>
    </li>
  );
}

export default function App() {
  return (
    <ShopProvider>
      <header>
        <UserBadge />
        <CartSummary />
      </header>
      <ul>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </ul>
    </ShopProvider>
  );
}
