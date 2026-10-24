Complete the `PriceTag` component in `price-tag.ts` (selector `app-price-tag`). The parent `App` in `app.ts` already uses it.

Declare these inputs with `input()`:

| Input | Type | Default | Notes |
| --- | --- | --- | --- |
| `label` | `string` | — | **required** |
| `amount` | `number` | — | **required** |
| `currency` | `string` | `'USD'` | |
| `discount` | `number` | `0` | percentage; use `numberAttribute` so `discount="25"` works |
| `highlighted` | `boolean` | `false` | use `booleanAttribute` so a bare `highlighted` attribute works |

Then:

1. Add a `computed` signal `finalPrice` = `amount() * (1 - discount() / 100)`.
2. Template: `<h3>` with the label, `<p class="price">` with `{currency} {finalPrice with 2 decimals}` (e.g. `USD 90.00`).
3. Only when `discount()` is greater than `0`, render `<s class="original">` with `{currency} {amount with 2 decimals}` (e.g. `USD 120.00`).
4. Add the class `highlighted` to the **host element** when `highlighted()` is true (use the `host` metadata).
