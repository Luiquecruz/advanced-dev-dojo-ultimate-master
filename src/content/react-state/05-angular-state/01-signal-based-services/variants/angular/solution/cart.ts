import { Injectable, computed, signal } from '@angular/core';

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

export type Product = Omit<CartItem, 'quantity'>;

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly state = signal<CartItem[]>([]);

  readonly items = this.state.asReadonly();
  readonly count = computed(() => this.items().reduce((sum, item) => sum + item.quantity, 0));
  readonly total = computed(() => this.items().reduce((sum, item) => sum + item.price * item.quantity, 0));

  add(product: Product) {
    this.state.update((items) =>
      items.some((item) => item.id === product.id)
        ? items.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item))
        : [...items, { ...product, quantity: 1 }],
    );
  }

  remove(id: number) {
    this.state.update((items) => items.filter((item) => item.id !== id));
  }
}
