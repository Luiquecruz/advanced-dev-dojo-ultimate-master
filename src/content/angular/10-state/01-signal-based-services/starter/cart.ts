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
  // TODO: private writable signal holding CartItem[]

  // TODO: readonly `items` created with asReadonly()

  // TODO: `count` and `total` computed signals

  add(product: Product) {
    // TODO: append with quantity 1 or increase the quantity (new array!)
  }

  remove(id: number) {
    // TODO: remove the item with this id
  }
}
