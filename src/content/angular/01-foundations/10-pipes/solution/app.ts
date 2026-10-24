import { Component, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, PercentPipe, TitleCasePipe, UpperCasePipe } from '@angular/common';
import { TruncatePipe } from './truncate-pipe';

@Component({
  selector: 'app-order-summary',
  imports: [CurrencyPipe, DatePipe, PercentPipe, TitleCasePipe, UpperCasePipe, TruncatePipe],
  template: `
    <h2>Order {{ order().id | uppercase }}</h2>
    <p class="customer">{{ order().customer | titlecase }}</p>
    <p class="total">{{ order().total | currency: 'EUR' }}</p>
    <p class="discount">{{ order().discount | percent }}</p>
    <p class="date">{{ order().placedAt | date: 'MMM d, y' : 'UTC' }}</p>
    <p class="note">{{ order().note | truncate: 20 }}</p>
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
