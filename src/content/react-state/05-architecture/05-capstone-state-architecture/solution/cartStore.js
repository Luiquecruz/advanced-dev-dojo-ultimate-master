import { create } from 'zustand';

export const useCartStore = create((set) => ({
  items: [],
  add: (product) =>
    set((state) => {
      const existing = state.items.find((item) => item.id === product.id);
      if (existing) {
        return {
          items: state.items.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)),
        };
      }
      return { items: [...state.items, { id: product.id, name: product.name, price: product.price, quantity: 1 }] };
    }),
  remove: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
}));

export const selectCount = (state) => state.items.reduce((sum, item) => sum + item.quantity, 0);

export const selectTotal = (state) => state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
