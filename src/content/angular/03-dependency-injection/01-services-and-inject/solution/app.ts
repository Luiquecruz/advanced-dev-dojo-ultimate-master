import { Component, inject } from '@angular/core';
import { CartService } from './cart.service';

@Component({
  selector: 'app-product-list',
  template: `
    <button (click)="cart.add('Keyboard')">Add Keyboard</button>
    <button (click)="cart.add('Mouse')">Add Mouse</button>
  `,
})
export class ProductList {
  protected readonly cart = inject(CartService);
}

@Component({
  selector: 'app-cart-badge',
  template: `
    <p>Items: {{ cart.count() }}</p>
    <button (click)="cart.clear()">Clear</button>
  `,
})
export class CartBadge {
  protected readonly cart = inject(CartService);
}

@Component({
  selector: 'app-root',
  imports: [ProductList, CartBadge],
  template: `
    <app-product-list />
    <app-cart-badge />
  `,
})
export class App {}
