A custom pipe is a class with `@Pipe({ name: 'truncate' })` and a `transform(value, ...args)` method. Then add `TruncatePipe` to the component's `imports`.
---
Built-in pipes must be imported too: `imports: [CurrencyPipe, DatePipe, PercentPipe, TitleCasePipe, UpperCasePipe, TruncatePipe]`.
---
Arguments use colons: `{{ order().total | currency: 'EUR' }}`, `{{ order().placedAt | date: 'MMM d, y' : 'UTC' }}`, `{{ order().note | truncate: 20 }}`. In `transform`: `value.slice(0, limit).trimEnd() + suffix`.
