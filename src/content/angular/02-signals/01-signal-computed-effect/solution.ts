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

  readonly itemCount = computed(() => this.items().reduce((count, item) => count + item.quantity, 0));
  readonly subtotal = computed(() => this.items().reduce((sum, item) => sum + item.price * item.quantity, 0));
  readonly tax = computed(() => this.subtotal() * this.taxRate());
  readonly total = computed(() => this.subtotal() + this.tax());

  constructor() {
    effect(() => {
      document.title = `Cart (${this.itemCount()})`;
      localStorage.setItem('cart', JSON.stringify(this.items()));
    });
  }

  add(name: string, price: number) {
    this.items.update((items) =>
      items.some((item) => item.name === name)
        ? items.map((item) => (item.name === name ? { ...item, quantity: item.quantity + 1 } : item))
        : [...items, { name, price, quantity: 1 }],
    );
  }

  remove(name: string) {
    this.items.update((items) => items.filter((item) => item.name !== name));
  }
}
