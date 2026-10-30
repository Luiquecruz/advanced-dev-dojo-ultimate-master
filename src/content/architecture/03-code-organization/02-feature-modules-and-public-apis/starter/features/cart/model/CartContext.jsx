import { createContext, useContext, useReducer } from 'react';

export const CartContext = createContext(null);

export function cartReducer(lines, action) {
  if (action.type === 'add') {
    const existing = lines.find((line) => line.id === action.product.id);
    if (existing) {
      return lines.map((line) => (line.id === action.product.id ? { ...line, quantity: line.quantity + 1 } : line));
    }
    return [...lines, { id: action.product.id, name: action.product.name, price: action.product.price, quantity: 1 }];
  }
  return lines;
}

export function CartProvider({ children }) {
  const [lines, dispatch] = useReducer(cartReducer, []);
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const total = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const addItem = (product) => dispatch({ type: 'add', product });
  return <CartContext.Provider value={{ lines, count, total, addItem }}>{children}</CartContext.Provider>;
}

export function useCart() {
  const cart = useContext(CartContext);
  if (!cart) {
    throw new Error('useCart must be used inside <CartProvider>');
  }
  return cart;
}
