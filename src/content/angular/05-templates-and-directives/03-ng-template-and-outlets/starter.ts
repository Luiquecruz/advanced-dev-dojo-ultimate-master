import { Component, TemplateRef, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

export interface ItemContext {
  $implicit: string;
  index: number;
}

@Component({
  selector: 'app-item-list',
  imports: [NgTemplateOutlet],
  template: `
    <!-- TODO: default <ng-template> showing the item text -->
    <!-- TODO: <p>No items</p> when empty, otherwise <ul> with an <li> per item rendering the template via ngTemplateOutlet -->
  `,
})
export class ItemList {
  // TODO: items (required) and itemTemplate (optional) inputs
}

@Component({
  selector: 'app-root',
  imports: [ItemList],
  template: `
    <!-- TODO: <app-item-list> with a custom #numbered template -->
  `,
})
export class App {
  protected readonly fruits = ['Apple', 'Banana', 'Cherry'];
}
