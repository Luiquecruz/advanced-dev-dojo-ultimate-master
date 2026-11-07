import { Component } from '@angular/core';

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

@Component({
  selector: 'app-page',
  template: `<!-- TODO: render two <app-counter> elements -->`,
})
export class Page {}
