import { defineStore } from 'pinia';

export interface CartItem {
  name: string;
  price: number;
  quantity: number;
}

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [] as CartItem[],
  }),
  getters: {
    count: (state) => state.items.reduce((sum, item) => sum + item.quantity, 0),
    total: (state) => state.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  },
  actions: {
    addItem(name: string, price: number) {
      const existing = this.items.find((item) => item.name === name);
      if (existing) {
        existing.quantity++;
        return;
      }
      this.items.push({ name, price, quantity: 1 });
    },
    removeItem(name: string) {
      this.items = this.items.filter((item) => item.name !== name);
    },
  },
});
