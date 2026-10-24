import { Component } from '@angular/core';
import { PriceTag } from './price-tag';

@Component({
  selector: 'app-root',
  imports: [PriceTag],
  template: `
    <app-price-tag label="Keyboard" [amount]="120" discount="25" highlighted />
    <app-price-tag label="Mouse" [amount]="45" currency="EUR" />
  `,
})
export class App {}
