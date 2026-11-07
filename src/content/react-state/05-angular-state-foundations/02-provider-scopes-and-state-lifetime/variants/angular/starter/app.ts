import { Component, forwardRef } from '@angular/core';

@Component({
  selector: 'app-page',
  imports: [forwardRef(() => Counter)],
  template: `<!-- TODO: render two <app-counter> elements -->`,
})
export class Page {}

@Component({
  selector: 'app-counter',
  template: `
    <!-- TODO: "Local: n" and "Shared: n" paragraphs -->
    <!-- TODO: "Local +1" and "Shared +1" buttons -->
  `,
})
export class Counter {
  // TODO: provide LocalCounter on this component and inject both services
}
