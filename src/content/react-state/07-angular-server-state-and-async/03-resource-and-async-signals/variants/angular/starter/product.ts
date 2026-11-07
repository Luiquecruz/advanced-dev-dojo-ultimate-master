import { Injectable, InjectionToken, computed, inject, resource, signal } from '@angular/core';

export interface Product {
  id: number;
  name: string;
}

export const FETCH_PRODUCT = new InjectionToken<(id: number, signal: AbortSignal) => Promise<Product>>('FETCH_PRODUCT');

@Injectable({ providedIn: 'root' })
export class ProductDetail {
  private readonly fetchProduct = inject(FETCH_PRODUCT);

  readonly id = signal<number | null>(1);

  // TODO: `product` resource with reactive params and a loader using abortSignal

  // TODO: `title` computed

  select(id: number | null) {
    // TODO
  }

  reload() {
    // TODO
  }
}
