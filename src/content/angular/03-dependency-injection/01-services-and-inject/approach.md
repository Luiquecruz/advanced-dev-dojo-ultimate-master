1. Decide where the state lives: both components need it, so it belongs in a root service.
2. Add `@Injectable({ providedIn: 'root' })` to `CartService` and store the items in a private writable signal.
3. Expose a read-only view (`asReadonly()`) and derive `count` with `computed()`.
4. Implement `add()` with an immutable `update()` and `clear()` with `set([])`.
5. Inject the service in `ProductList` and `CartBadge` with `inject()` in a field initializer.
6. Bind the buttons to the service methods and interpolate `cart.count()` in the badge.
