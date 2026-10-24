import { create } from 'zustand';

export const useCartStore = create((set) => ({
  items: [],
  addItem: (product) =>
    set((state) => {
      const existing = state.items.find((item) => item.id === product.id);
      if (existing) {
        return {
          items: state.items.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)),
        };
      }
      return { items: [...state.items, { ...product, quantity: 1 }] };
    }),
  removeItem: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
  clear: () => set({ items: [] }),
}));

export const selectCount = (state) => state.items.reduce((sum, item) => sum + item.quantity, 0);

export const selectTotal = (state) => state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
