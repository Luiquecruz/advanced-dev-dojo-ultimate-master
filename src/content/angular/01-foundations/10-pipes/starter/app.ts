import { Component, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, PercentPipe, TitleCasePipe, UpperCasePipe } from '@angular/common';
import { TruncatePipe } from './truncate-pipe';

@Component({
  selector: 'app-order-summary',
  // TODO: import the pipes used by the template
  template: `
    <!-- TODO: apply the pipes -->
    <h2>Order {{ order().id }}</h2>
    <p class="customer">{{ order().customer }}</p>
    <p class="total">{{ order().total }}</p>
    <p class="discount">{{ order().discount }}</p>
    <p class="date"></p>
    <p class="note">{{ order().note }}</p>
  `,
})
export class OrderSummary {
  readonly order = signal({
    id: 'ab12',
    customer: 'ada lovelace',
    total: 1234.5,
    discount: 0.15,
    placedAt: new Date(Date.UTC(2026, 2, 14, 9, 30)),
    note: 'Please leave the package at the back door',
  });
}
