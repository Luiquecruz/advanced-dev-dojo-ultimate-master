Decorate the service with `@Injectable({ providedIn: 'root' })` so every `inject(CartService)` call receives the same instance.
---
Keep a private `signal<string[]>([])` and expose it with `asReadonly()`. `count` is `computed(() => this.state().length)`.
---
Never `push` into the array: `this.state.update((items) => [...items, item])` creates a new array so signals notice the change.
---
In each component: `protected readonly cart = inject(CartService);`, then `(click)="cart.add('Keyboard')"` and `{{ cart.count() }}` in the templates.
