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
    // TODO: count — total quantity of all items
    // TODO: total — sum of price * quantity
  },
  actions: {
    addItem(name: string, price: number) {
      // TODO: push a new item or increment the quantity of an existing one
    },
    removeItem(name: string) {
      // TODO: remove the item with that name
    },
  },
});
