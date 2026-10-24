import { create } from 'zustand';

export const useCartStore = create((set) => ({
  items: [],
  // TODO: add(product) appends { id, name, price, quantity: 1 } or increments the quantity of an existing line (immutably)
  add: (product) => {},
  // TODO: remove(id) removes the line with that id
  remove: (id) => {},
}));

// TODO: sum of quantities
export const selectCount = (state) => 0;

// TODO: sum of price * quantity
export const selectTotal = (state) => 0;
