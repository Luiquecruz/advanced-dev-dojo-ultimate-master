import { ApplicationConfig, Component, inject, Injectable, signal } from '@angular/core';
import { HttpClient, httpResource, provideHttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
    return this.http.get<Product>(`/api/products/${id}`);
  }
}

@Component({
  selector: 'app-product-list',
  template: `
    <label>Search <input name="search" [value]="query()" (input)="query.set($any($event.target).value)" /></label>
    @if (products.isLoading()) {
      <p role="status">Loading products…</p>
    } @else if (products.error()) {
      <p role="alert">Could not load products</p>
      <button type="button" (click)="products.reload()">Retry</button>
    } @else {
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

  protected readonly products = httpResource<Product[]>(() => ({ url: '/api/products', params: { q: this.query() } }), { defaultValue: [] });
}

export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient()],
};
