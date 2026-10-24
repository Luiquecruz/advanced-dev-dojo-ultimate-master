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

  readonly selectedSize = linkedSignal<string[], string>({
    source: () => this.product().sizes,
    computation: (sizes, previous) => (previous && sizes.includes(previous.value) ? previous.value : sizes[0]),
  });
  readonly quantity = linkedSignal(() => this.product().minQuantity);

  selectSize(size: string) {
    this.selectedSize.set(size);
  }

  addOne() {
    this.quantity.update((quantity) => quantity + 1);
  }
}
