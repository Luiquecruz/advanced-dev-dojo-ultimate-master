import { ApplicationConfig, Component, inject, Injectable, signal } from '@angular/core';
import { HttpClient, httpResource, provideHttpClient } from '@angular/common/http';
import { EMPTY, Observable } from 'rxjs';

export interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);

  getById(id: number): Observable<Product> {
    // TODO: GET /api/products/<id> typed as Product
    return EMPTY;
  }
}

@Component({
  selector: 'app-product-list',
  template: `
    <label>Search <input name="search" [value]="query()" (input)="query.set($any($event.target).value)" /></label>
    @if (products.isLoading()) {
      <p role="status">Loading products…</p>
    }
    <!-- TODO: add an error branch before the list: <p role="alert">Could not load products</p> and a Retry button that calls products.reload() -->
    @else {
      <ul>
        @for (product of products.value(); track product.id) {
          <li>{{ product.name }}</li>
        }
      </ul>
    }
  `,
})
export class ProductList {
  protected readonly query = signal('');

  // TODO: an httpResource<Product[]> that reads query() inside its request function,
  //       sends GET /api/products with the query parameter q, and starts with an empty array
  protected readonly products = {} as never;
}

export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient()],
};
