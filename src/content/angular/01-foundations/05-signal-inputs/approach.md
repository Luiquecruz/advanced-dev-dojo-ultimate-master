1. Declare `label` and `amount` with `input.required<...>()`.
2. Declare `currency = input('USD')`, then `discount` and `highlighted` with `numberAttribute` / `booleanAttribute` transforms so string attributes from the parent template become a number and a boolean.
3. Derive `finalPrice` with `computed()` reading `amount()` and `discount()`.
4. Write the template: heading, price paragraph with `toFixed(2)`, and the `@if`-guarded original price.
5. Add the `host` metadata with a `[class.highlighted]` binding.
6. Render `App` in the preview to see both tags: the static `discount="25"` and bare `highlighted` attributes now work.
