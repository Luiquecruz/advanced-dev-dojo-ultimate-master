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

  readonly product = resource({
    params: () => {
      const id = this.id();
      return id === null ? undefined : { id };
    },
    loader: ({ params, abortSignal }) => this.fetchProduct(params.id, abortSignal),
  });

  readonly title = computed(() => (this.product.hasValue() ? this.product.value().name : 'Loading...'));

  select(id: number | null) {
    this.id.set(id);
  }

  reload() {
    this.product.reload();
  }
}
