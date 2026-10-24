import { Component, signal } from '@angular/core';
import { Product, VariantPicker } from './variant-picker';

@Component({
  selector: 'app-root',
  imports: [VariantPicker],
  template: `
    <nav>
      @for (product of products; track product.name) {
        <button (click)="current.set(product)">Show {{ product.name }}</button>
      }
    </nav>
    <app-variant-picker [product]="current()" />
  `,
})
export class App {
  protected readonly products: Product[] = [
    { name: 'T-Shirt', sizes: ['S', 'M', 'L', 'XL'], minQuantity: 1 },
    { name: 'Hoodie', sizes: ['M', 'L', 'XL'], minQuantity: 1 },
    { name: 'Socks', sizes: ['One size'], minQuantity: 2 },
  ];
  readonly current = signal(this.products[0]);
}
