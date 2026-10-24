import { ApplicationConfig, Component, inject } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable, Subject, debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { Product, ProductApi } from './product-api';

export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient()],
};

export function searchProducts(
  queries$: Observable<string>,
  search: (query: string) => Observable<Product[]>,
  debounceMs = 300,
): Observable<Product[]> {
  return queries$.pipe(
    debounceTime(debounceMs),
    map((query) => query.trim()),
    distinctUntilChanged(),
    switchMap((query) => (query.length < 2 ? of([]) : search(query))),
  );
}

@Component({
  selector: 'app-product-search',
  template: `
    <input #box type="search" aria-label="Search products" (input)="queries.next(box.value)" />
    <ul>
      @for (product of results(); track product.id) {
        <li>{{ product.name }} ({{ product.price }})</li>
      }
    </ul>
  `,
})
export class ProductSearch {
  private readonly api = inject(ProductApi);
  protected readonly queries = new Subject<string>();
  protected readonly results = toSignal(
    searchProducts(this.queries, (query) => this.api.search(query)),
    { initialValue: [] },
  );
}
