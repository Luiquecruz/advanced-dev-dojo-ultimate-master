import { Injectable, computed, linkedSignal, signal } from '@angular/core';

export interface Product {
  id: number;
  name: string;
  category: string;
}

@Injectable({ providedIn: 'root' })
export class CatalogState {
  readonly pageSize = 2;

  private readonly productList = signal<Product[]>([]);
  private readonly selected = signal('all');

  readonly products = this.productList.asReadonly();
  readonly category = this.selected.asReadonly();

  readonly filtered = computed(() =>
    this.productList().filter((product) => this.selected() === 'all' || product.category === this.selected()),
  );

  readonly page = linkedSignal(() => {
    this.selected();
    return 1;
  });

  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));

  readonly visible = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  load(products: Product[]) {
    this.productList.set(products);
  }

  selectCategory(category: string) {
    this.selected.set(category);
  }

  goTo(page: number) {
    this.page.set(page);
  }
}
