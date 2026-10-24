Build a variant picker. In `variant-picker.ts`, the `VariantPicker` component (selector `app-variant-picker`) receives a required `product` input (`{ name, sizes, minQuantity }`). Its template (size buttons, selection text and a **More** button) is ready.

1. Replace the `selectedSize` placeholder with a `linkedSignal` using the long form (`source` + `computation`):
   - source: `product().sizes`;
   - when the previous selected size exists in the new sizes, keep it; otherwise select the first size.
2. Replace the `quantity` placeholder with a short-form `linkedSignal` that resets to `product().minQuantity` whenever the product changes.
3. Implement `selectSize(size)` (set `selectedSize`) and `addOne()` (increase `quantity` by 1).

`App` in `app.ts` switches between a T-Shirt (S, M, L, XL), a Hoodie (M, L, XL) and Socks (One size, minimum quantity 2).

The selection text is `Size: <size> · Qty: <quantity>`, e.g. `Size: S · Qty: 1`.
