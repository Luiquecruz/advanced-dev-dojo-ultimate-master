import { Component, inject } from '@angular/core';
import { CartService } from './cart';

@Component({
  selector: 'app-cart-summary',
  template: `
    <p>Items: {{ cart.count() }}</p>
    <p>Total: {{ cart.total() }}</p>
    <button (click)="cart.add({ id: 1, name: 'Keyboard', price: 120 })">Add Keyboard</button>
    <button (click)="cart.add({ id: 2, name: 'Mouse', price: 45 })">Add Mouse</button>
    <ul>
      @for (item of cart.items(); track item.id) {
        <li>{{ item.name }} x {{ item.quantity }}</li>
      }
    </ul>
  `,
})
export class CartSummary {
  protected readonly cart = inject(CartService);
}
