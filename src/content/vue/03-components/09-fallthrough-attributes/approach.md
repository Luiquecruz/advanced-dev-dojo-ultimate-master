1. Give `BaseButton` a single `<button class="btn">` root with a `<slot />`, and nothing else.
2. In `BaseInput`, disable inheritance with `defineOptions`.
3. Spread `$attrs` onto the inner `<input>` so undeclared attributes and listeners land there.
4. Run the app: the email input gets `type` and `placeholder`, and the button submits the form.
