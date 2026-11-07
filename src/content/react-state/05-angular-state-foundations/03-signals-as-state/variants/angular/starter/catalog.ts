import { Injectable, computed, linkedSignal, signal } from '@angular/core';

export interface Product {
  id: number;
  name: string;
  category: string;
}

@Injectable({ providedIn: 'root' })
export class CatalogState {
  readonly pageSize = 2;

  // TODO: private signals for the list and the category, with read-only `products` and `category`

  // TODO: `filtered`, `page` (linkedSignal), `pageCount` and `visible`

  load(products: Product[]) {
    // TODO
  }

  selectCategory(category: string) {
    // TODO
  }

  goTo(page: number) {
    // TODO
  }
}
