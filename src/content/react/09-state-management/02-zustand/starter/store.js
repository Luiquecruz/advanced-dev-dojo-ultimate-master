import { create } from 'zustand';

export const useCartStore = create((set) => ({
  items: [],
  // TODO: addItem(product) adds { ...product, quantity: 1 } or increments the quantity of an existing item
  addItem: (product) => {},
  // TODO: removeItem(id) removes the item with that id
  removeItem: (id) => {},
  // TODO: clear() empties the cart
  clear: () => {},
}));

// TODO: return the sum of every item's quantity
export const selectCount = (state) => 0;

// TODO: return the sum of price * quantity
export const selectTotal = (state) => 0;
