# Smart and Presentational Components

A screen that loads data, holds state and draws every detail in one class becomes hard to test and impossible to reuse. Splitting it into a container that talks to the back end and presentational components that only draw what they are given keeps each part small. This lesson shows the split with signal inputs and outputs, using a product list and a cart.

You need: Calling the API with HttpClient and httpResource, Pagination and Sorting in Angular.

## Two kinds of component

A **presentational** component (also called dumb or UI component) receives data through inputs, shows it, and reports what the user did through outputs. It injects no service, makes no HTTP call and keeps no business state.

A **container** (smart component) knows where the data comes from. It injects services or owns an `httpResource`, holds the state of the screen, and passes data down and handles events coming up.

```
ProductsPage (container)  -- product, selected -->  ProductCard (presentational)
   httpResource, cart       <-- add(product) ------
```

The comparison with a Spring application is direct: the container plays the role of a controller that calls services, and the presentational component is a view that only renders a model.

## Signal inputs and outputs

A component declares its inputs and outputs as fields. `input()` creates a read-only signal fed by the parent, `input.required<T>()` makes the parent supply a value, and `output<T>()` creates an event the parent can listen to.

```ts
@Component({
  selector: 'app-product-card',
  imports: [CurrencyPipe],
  template: `
    <article [class.selected]="selected()">
      <h3>{{ product().name }}</h3>
      <p>{{ product().price | currency }}</p>
      <button type="button" (click)="add.emit(product())">Add {{ product().name }}</button>
    </article>
  `,
})
export class ProductCard {
  readonly product = input.required<Product>();
  readonly selected = input(false);
  readonly add = output<Product>();
}
```

Inputs are read like any signal, by calling them: `product().name`. A component cannot write to its own input; if the value must change, it emits an event and the owner changes it. The `currency` pipe formats `120` as `$120.00` for the default locale.

The card has no constructor and no `inject()` call. It renders from its inputs alone, so a test, a style guide or a different screen can use it with any data.

## The container owns the state

The container loads the list, keeps the cart in a signal and derives everything else from those two:

```ts
@Component({
  selector: 'app-products-page',
  imports: [ProductCard, CurrencyPipe],
  template: `
    @if (products.isLoading()) {
      <p role="status">Loading products…</p>
    } @else if (products.error()) {
      <p role="alert">Could not load products</p>
      <button type="button" (click)="products.reload()">Retry</button>
    } @else {
      @for (product of products.value(); track product.id) {
        <app-product-card [product]="product" [selected]="isInCart(product.id)" (add)="addToCart($event)" />
      }
    }
    <p>Cart: {{ cart().length }} item(s), total {{ total() | currency }}</p>
  `,
})
export class ProductsPage {
  protected readonly products = httpResource<Product[]>(() => '/api/products', { defaultValue: [] });
  protected readonly cart = signal<Product[]>([]);
  protected readonly total = computed(() => this.cart().reduce((sum, product) => sum + product.price, 0));

  protected isInCart(id: number): boolean {
    return this.cart().some((product) => product.id === id);
  }

  protected addToCart(product: Product): void {
    if (this.isInCart(product.id)) {
      return;
    }
    this.cart.update((items) => [...items, product]);
  }
}
```

The data flows down through `[product]` and `[selected]`, and events flow up through `(add)`; `$event` is the value that `emit` carried. The total is a `computed`, so it can never disagree with the cart: nothing stores it. `update` receives the old array and returns a new one, which is how a signal learns that something changed. Pushing into the existing array would change the content without telling any reader.

## Where the split pays off

- **Testing.** The card is tested by giving it inputs and listening to its output. Only the container needs HTTP providers or a fake server.
- **Reuse.** The same card can sit in a search result, a wishlist and an admin screen.
- **Change.** When the back end changes, such as a new field in the JSON, the container and its mapping change and the cards stay as they are.

The split is a guideline, not a law. A tiny component used once can load its own data, and a container that grows many unrelated responsibilities should be divided again, usually by moving data access into a service.

## Common mistakes

- Injecting `HttpClient` or a service into a presentational component. It then works on only one screen with one back end and needs providers in every test.
- Mutating an input or an array held in a signal. Inputs are read-only, and in-place changes to an array do not notify readers; replace it with a new array.
- Storing a value that can be derived, such as the cart total. Two copies drift apart; use `computed`.
- Passing the whole container into a child "for convenience". The child then depends on the parent's internals instead of a small contract of inputs and outputs.

## In practice

Teams keep the presentational components in a shared folder that never imports a data service, and the containers next to the routes that own them. A quick review rule follows: if a component imports `HttpClient`, a store or the router, it is a container, and the components below it should receive plain values.

## Check yourself

1. Which of the two kinds of component may inject `HttpClient`, and why?
2. Why is the cart total a `computed` instead of a signal that `addToCart` updates?
3. How does a card tell its parent that the user clicked "Add"?
