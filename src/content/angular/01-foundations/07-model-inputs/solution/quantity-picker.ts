import { Component, input, model } from '@angular/core';

@Component({
  selector: 'app-quantity-picker',
  template: `
    <button aria-label="Decrease" [disabled]="value() <= min()" (click)="decrease()">−</button>
    <span class="value">{{ value() }}</span>
    <button aria-label="Increase" [disabled]="value() >= max()" (click)="increase()">+</button>
  `,
})
export class QuantityPicker {
  readonly min = input(1);
  readonly max = input(10);
  readonly value = model(1);

  decrease() {
    this.value.update((value) => Math.max(this.min(), value - 1));
  }

  increase() {
    this.value.update((value) => Math.min(this.max(), value + 1));
  }
}
