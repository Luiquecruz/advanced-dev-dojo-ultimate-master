import { Component, input, linkedSignal, signal } from '@angular/core';

export interface Product {
  name: string;
  sizes: string[];
  minQuantity: number;
}

@Component({
  selector: 'app-variant-picker',
  template: `
    <h3>{{ product().name }}</h3>
    @for (size of product().sizes; track size) {
      <button [attr.aria-pressed]="size === selectedSize()" (click)="selectSize(size)">{{ size }}</button>
    }
    <p class="selection">Size: {{ selectedSize() }} · Qty: {{ quantity() }}</p>
    <button (click)="addOne()">More</button>
  `,
})
export class VariantPicker {
  readonly product = input.required<Product>();

  // TODO: linkedSignal that keeps the previous size when still available, else the first size
  readonly selectedSize = signal('');
  // TODO: linkedSignal that resets to product().minQuantity
  readonly quantity = signal(0);

  selectSize(size: string) {
    // TODO
  }

  addOne() {
    // TODO
  }
}
