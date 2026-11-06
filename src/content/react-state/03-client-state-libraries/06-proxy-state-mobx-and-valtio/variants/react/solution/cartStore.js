import { makeAutoObservable } from 'mobx';

export class CartStore {
  items = [];

  constructor() {
    makeAutoObservable(this);
  }

  get count() {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  get total() {
    return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  add(product) {
    const existing = this.items.find((item) => item.id === product.id);
    if (existing) {
      existing.quantity += 1;
      return;
    }
    this.items.push({ id: product.id, name: product.name, price: product.price, quantity: 1 });
  }

  remove(id) {
    this.items = this.items.filter((item) => item.id !== id);
  }
}

export function createCartStore() {
  return new CartStore();
}
