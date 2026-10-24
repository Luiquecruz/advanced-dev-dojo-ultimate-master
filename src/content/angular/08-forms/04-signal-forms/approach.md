1. Import `FormField` in the component and create `profileForm` with `form(this.model)`.
2. Add `[formField]` bindings to the four inputs, using dot paths for the nested city.
3. Render the dirty indicator from `profileForm().dirty()`.
4. Implement `loadSample()` by writing the model signal directly.
5. Implement `reset()` through the root field state so values and interaction state go back together.
