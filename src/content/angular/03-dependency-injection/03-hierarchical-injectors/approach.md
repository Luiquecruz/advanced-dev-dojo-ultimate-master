1. Make `CounterStore` injectable but not root-provided, with a `count` signal and `increment()`.
2. Register it in `CounterPanel.providers` so each panel element gets its own instance.
3. Inject it in `CounterButton`; resolution walks up to the closest panel.
4. Inject it optionally in `CounterDisplay` and branch on `null` in the template.
5. Render two panels and one stray display in `App` to observe the three different resolution results.
