import { Component, computed, effect, signal } from '@angular/core';

interface CartItem {
  name: string;
  price: number;
  quantity: number;
}

@Component({
  selector: 'app-cart',
  template: `
    <ul>
      @for (item of items(); track item.name) {
        <li>
          {{ item.name }} × {{ item.quantity }}
          <button [attr.aria-label]="'Remove ' + item.name" (click)="remove(item.name)">✕</button>
        </li>
      }
    </ul>
    <button (click)="add('Mouse', 45)">Add mouse</button>
    <button (click)="add('Monitor', 340)">Add monitor</button>
    <p class="count">Items: {{ itemCount() }}</p>
    <p class="subtotal">Subtotal: \${{ subtotal().toFixed(2) }}</p>
    <p class="tax">Tax: \${{ tax().toFixed(2) }}</p>
    <p class="total">Total: \${{ total().toFixed(2) }}</p>
  `,
})
export class Cart {
  readonly items = signal<CartItem[]>([
    { name: 'Keyboard', price: 120, quantity: 1 },
    { name: 'Mouse', price: 45, quantity: 2 },
  ]);
  readonly taxRate = signal(0.1);

  // TODO: itemCount, subtotal, tax and total computed signals
  readonly itemCount = signal(0);
  readonly subtotal = signal(0);
  readonly tax = signal(0);
  readonly total = signal(0);

  constructor() {
    // TODO: effect that updates document.title and localStorage
  }

  add(name: string, price: number) {
    // TODO: increment an existing item or append a new one, immutably
  }

  remove(name: string) {
    // TODO: remove the item immutably
  }
}
