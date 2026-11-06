import { createContext, use, useMemo, useReducer, useState } from 'react';

export const products = [
  { id: 1, name: 'Keyboard', price: 120 },
  { id: 2, name: 'Mouse', price: 45 },
  { id: 3, name: 'Monitor', price: 340 },
];

const UserContext = createContext(null);
const CartContext = createContext(null);
const CartActionsContext = createContext(null);

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

  const userValue = useMemo(
    () => ({ user, signIn: (name) => setUser({ name }), signOut: () => setUser(null) }),
    [user],
  );

  const cartValue = useMemo(
    () => ({
      items,
      count: items.reduce((sum, item) => sum + item.quantity, 0),
      total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    }),
    [items],
  );

  const cartActions = useMemo(
    () => ({
      addItem: (product) => dispatch({ type: 'added', product }),
      removeItem: (id) => dispatch({ type: 'removed', id }),
      clear: () => dispatch({ type: 'cleared' }),
    }),
    [],
  );

  return (
    <UserContext value={userValue}>
      <CartActionsContext value={cartActions}>
        <CartContext value={cartValue}>{children}</CartContext>
      </CartActionsContext>
    </UserContext>
  );
}

function useRequired(Context, hookName) {
  const value = use(Context);
  if (value === null) {
    throw new Error(`${hookName} must be used within a ShopProvider`);
  }
  return value;
}

export const useUser = () => useRequired(UserContext, 'useUser');
export const useCart = () => useRequired(CartContext, 'useCart');
export const useCartActions = () => useRequired(CartActionsContext, 'useCartActions');

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
