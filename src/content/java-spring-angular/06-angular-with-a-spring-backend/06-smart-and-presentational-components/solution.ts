import { ApplicationConfig, Component, computed, input, output, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { httpResource, provideHttpClient } from '@angular/common/http';

export interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
}

@Component({
  selector: 'app-product-card',
  imports: [CurrencyPipe],
  template: `
    <article [class.selected]="selected()">
      <h3>{{ product().name }}</h3>
      <p>{{ product().price | currency }}</p>
      <button type="button" (click)="add.emit(product())">Add {{ product().name }}</button>
    </article>
  `,
})
export class ProductCard {
  readonly product = input.required<Product>();
  readonly selected = input(false);
  readonly add = output<Product>();
}

@Component({
  selector: 'app-products-page',
  imports: [ProductCard, CurrencyPipe],
  template: `
    <h2>Products</h2>
    @for (product of products.value(); track product.id) {
      <app-product-card [product]="product" [selected]="isInCart(product.id)" (add)="addToCart($event)" />
    }
    <p>Cart: {{ cart().length }} item(s), total {{ total() | currency }}</p>
  `,
})
export class ProductsPage {
  protected readonly products = httpResource<Product[]>(() => '/api/products', { defaultValue: [] });
  protected readonly cart = signal<Product[]>([]);
  protected readonly total = computed(() => this.cart().reduce((sum, product) => sum + product.price, 0));

  protected isInCart(id: number): boolean {
    return this.cart().some((product) => product.id === id);
  }

  protected addToCart(product: Product): void {
    if (this.isInCart(product.id)) {
      return;
    }
    this.cart.update((items) => [...items, product]);
  }
}

export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient()],
};
