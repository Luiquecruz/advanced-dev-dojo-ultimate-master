import { computed, inject, InjectionToken } from '@angular/core';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';

export interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
}

export interface CartStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const FETCH_PRODUCTS = new InjectionToken<() => Promise<Product[]>>('FETCH_PRODUCTS');
export const CART_STORAGE = new InjectionToken<CartStorage>('CART_STORAGE');

type ShopState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  products: Product[];
  category: string;
  quantities: Record<number, number>;
};

const initialState: ShopState = { status: 'idle', products: [], category: 'all', quantities: {} };

export const ShopStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  // TODO: withComputed: visible, lines, total, itemCount
  // TODO: withMethods: load, setCategory, add, remove (persist the cart after add and remove)
  // TODO: withHooks: restore the cart in onInit
);
