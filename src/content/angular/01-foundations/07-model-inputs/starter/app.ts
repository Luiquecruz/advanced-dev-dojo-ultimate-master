import { Component, signal } from '@angular/core';
import { QuantityPicker } from './quantity-picker';

@Component({
  selector: 'app-root',
  imports: [QuantityPicker],
  template: `
    <!-- TODO: two-way bind value to quantity -->
    <app-quantity-picker />
    <p class="total">Total: \${{ quantity() * price }}</p>
    <button (click)="quantity.set(1)">Reset</button>
  `,
})
export class App {
  readonly quantity = signal(2);
  protected readonly price = 15;
}
