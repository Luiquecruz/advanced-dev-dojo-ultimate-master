Format an order with built-in pipes and a custom one.

**`truncate-pipe.ts`** — create and export `TruncatePipe`:

1. Pipe name `truncate`, implementing `PipeTransform`.
2. `transform(value: string, limit = 20, suffix = '…')`: when `value` is longer than `limit`, return the first `limit` characters with trailing spaces removed, followed by `suffix`; otherwise return `value` unchanged.
   - `'Hello brave new world'` with limit `6` → `'Hello…'`

**`app.ts`** — in `OrderSummary` (selector `app-order-summary`), import the pipes you need and render:

| Element | Expression | Expected output |
| --- | --- | --- |
| `<h2>` | `Order ` + `order().id` in uppercase | `Order AB12` |
| `<p class="customer">` | `order().customer` in title case | `Ada Lovelace` |
| `<p class="total">` | `order().total` as `EUR` currency | `€1,234.50` |
| `<p class="discount">` | `order().discount` as percent | `15%` |
| `<p class="date">` | `order().placedAt` with format `'MMM d, y'` and timezone `'UTC'` | `Mar 14, 2026` |
| `<p class="note">` | `order().note` with `truncate` and a limit of `20` | `Please leave the pac…` |
