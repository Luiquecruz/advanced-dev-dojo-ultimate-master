Build the state of a paged product list. **`catalog.ts`** exports `CatalogState` (`@Injectable({ providedIn: 'root' })`) and the `Product` interface `{ id: number; name: string; category: string }`.

1. `products`: a read-only signal (created with `asReadonly()`) holding the list, set with `load(products: Product[])`.
2. `category`: a read-only signal with the selected category, starting at `'all'`; `selectCategory(category: string)` changes it.
3. `filtered`: a `computed` with the products of the selected category, or all of them for `'all'`.
4. `pageSize` is the constant `2`. `page`: a `linkedSignal` that starts at `1` and goes back to `1` whenever the category changes. `goTo(page: number)` sets it.
5. `pageCount`: a `computed` with the number of pages, never less than `1`.
6. `visible`: a `computed` with the products of the current page.

Do not use `effect`. The tests check that the source does not call it.
