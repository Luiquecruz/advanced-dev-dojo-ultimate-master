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
    <!-- TODO: @defer on interaction(reviewsTrigger); prefetch on idle, with @placeholder, @loading (minimum 200ms) and @error -->
    <app-reviews />
    <!-- TODO: @defer on idle with a @placeholder -->
    <app-recommendations />
  `,
})
export class ProductPage {}
