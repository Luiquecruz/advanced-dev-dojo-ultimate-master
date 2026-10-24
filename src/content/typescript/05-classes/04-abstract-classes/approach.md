1. Add `abstract` to the class declaration.
2. Turn `format` into an abstract property and `renderBody` into a protected abstract method without a body.
3. Keep `render` as the template method that combines the title with the body.
4. In each subclass, set `format` and implement `renderBody` with `map` and `join('\n')`.
