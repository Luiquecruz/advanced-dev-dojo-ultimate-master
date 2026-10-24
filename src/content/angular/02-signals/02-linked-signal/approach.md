1. Replace `quantity` with a short-form `linkedSignal` reading `product().minQuantity`; it resets whenever the product input changes.
2. Replace `selectedSize` with the long form: `source` returns the product's sizes, `computation` receives the new sizes and the previous state.
3. In `computation`, keep `previous.value` when it's included in the new sizes, otherwise return the first size.
4. Implement `selectSize` with `set` and `addOne` with `update`: linked signals are writable.
5. Switch products in the preview to see the size kept (T-Shirt XL → Hoodie XL) or reset (→ Socks).
