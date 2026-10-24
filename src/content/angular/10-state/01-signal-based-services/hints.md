Start in `cart.ts`: `private readonly state = signal<CartItem[]>([]);` then `readonly items = this.state.asReadonly();`.
---
Derived values: `readonly count = computed(() => this.items().reduce((sum, item) => sum + item.quantity, 0));`. `total` follows the same shape with `item.price * item.quantity`.
---
In `add`, use `this.state.update(items => ...)`: if `items.some(item => item.id === product.id)`, return `items.map(...)` with `{ ...item, quantity: item.quantity + 1 }`; otherwise return `[...items, { ...product, quantity: 1 }]`.
---
In the component, `protected readonly cart = inject(CartService);` and read it in the template with `cart.count()`, `cart.total()` and `@for (item of cart.items(); track item.id)`.
