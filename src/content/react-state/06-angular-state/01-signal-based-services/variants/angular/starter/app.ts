import { Component, inject } from '@angular/core';
import { CartService } from './cart';

@Component({
  selector: 'app-cart-summary',
  template: `
    <!-- TODO: "Items: ..." and "Total: ..." paragraphs -->
    <!-- TODO: "Add Keyboard" and "Add Mouse" buttons -->
    <!-- TODO: one <li> per item: "Keyboard x 2" -->
  `,
})
export class CartSummary {
  // TODO: inject CartService
}
