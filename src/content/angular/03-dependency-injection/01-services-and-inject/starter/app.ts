import { Component, inject } from '@angular/core';
import { CartService } from './cart.service';

@Component({
  selector: 'app-product-list',
  template: `
    <!-- TODO: "Add Keyboard" and "Add Mouse" buttons -->
  `,
})
export class ProductList {
  // TODO: inject CartService
}

@Component({
  selector: 'app-cart-badge',
  template: `
    <!-- TODO: <p>Items: N</p> and a Clear button -->
  `,
})
export class CartBadge {
  // TODO: inject CartService
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
