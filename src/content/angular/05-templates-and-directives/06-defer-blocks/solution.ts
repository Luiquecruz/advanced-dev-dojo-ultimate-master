import { Component } from '@angular/core';

@Component({
  selector: 'app-reviews',
  template: `<p>Great product!</p>`,
})
export class Reviews {}

@Component({
  selector: 'app-recommendations',
  template: `<p>You may also like: Mouse</p>`,
})
export class Recommendations {}

@Component({
  selector: 'app-product-page',
  imports: [Reviews, Recommendations],
  template: `
    <h1>Mechanical Keyboard</h1>
    <button #reviewsTrigger>Show reviews</button>
    @defer (on interaction(reviewsTrigger); prefetch on idle) {
      <app-reviews />
    } @placeholder {
      <p>Reviews will load when you click.</p>
    } @loading (minimum 200ms) {
      <p>Loading reviews...</p>
    } @error {
      <p>Could not load reviews.</p>
    }
    @defer (on idle) {
      <app-recommendations />
    } @placeholder {
      <p>Recommendations coming soon</p>
    }
  `,
})
export class ProductPage {}
