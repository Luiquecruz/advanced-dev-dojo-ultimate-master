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
    <ng-template #defaultItem let-item>{{ item }}</ng-template>
    @if (items().length === 0) {
      <p>No items</p>
    } @else {
      <ul>
        @for (item of items(); track $index) {
          <li>
            <ng-container *ngTemplateOutlet="itemTemplate() ?? defaultItem; context: { $implicit: item, index: $index }" />
          </li>
        }
      </ul>
    }
  `,
})
export class ItemList {
  readonly items = input.required<string[]>();
  readonly itemTemplate = input<TemplateRef<ItemContext>>();
}

@Component({
  selector: 'app-root',
  imports: [ItemList],
  template: `
    <app-item-list [items]="fruits" [itemTemplate]="numbered" />
    <ng-template #numbered let-fruit let-i="index">
      <strong>{{ i + 1 }}. {{ fruit }}</strong>
    </ng-template>
  `,
})
export class App {
  protected readonly fruits = ['Apple', 'Banana', 'Cherry'];
}
