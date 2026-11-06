import { ApplicationConfig, Component, computed, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';

export interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
}

@Component({
  selector: 'app-product-card',
  imports: [CurrencyPipe],
  // TODO: <article> with the class "selected" while selected() is true, an <h3> with the name, a <p> with the price through the currency pipe,
  //       and a <button type="button"> labelled "Add <name>" that emits the product through the add output
  template: ``,
})
export class ProductCard {
  // TODO: product = input.required<Product>(), selected = input(false), add = output<Product>()
  // A presentational component receives data and reports events: it must not inject HttpClient or any service.
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
  // TODO: products = httpResource<Product[]> for GET /api/products that starts with an empty array
  protected readonly products = { value: (): Product[] => [] };
  // TODO: cart = signal<Product[]>([]) and total = computed(...) with the sum of the prices in the cart
  protected readonly cart = signal<Product[]>([]);
  protected readonly total = computed(() => 0);

  protected isInCart(id: number): boolean {
    // TODO: true when the cart holds a product with this id
    return false;
  }

  protected addToCart(product: Product): void {
    // TODO: append the product to the cart, once: adding a product that is already in the cart does nothing
  }
}

export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient()],
};
