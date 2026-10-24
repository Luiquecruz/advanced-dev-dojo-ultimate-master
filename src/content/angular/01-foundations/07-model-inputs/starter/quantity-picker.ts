import { Component, input, model } from '@angular/core';

@Component({
  selector: 'app-quantity-picker',
  template: `
    <!-- TODO: Decrease button, <span class="value">, Increase button -->
  `,
})
export class QuantityPicker {
  readonly min = input(1);
  readonly max = input(10);
  // TODO: declare value with model()

  decrease() {
    // TODO
  }

  increase() {
    // TODO
  }
}
