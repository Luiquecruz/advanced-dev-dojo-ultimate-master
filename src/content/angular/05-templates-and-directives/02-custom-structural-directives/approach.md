1. Remember what `*appUnless="x"` compiles to: an `<ng-template>` with an `[appUnless]` binding, so the directive receives a `TemplateRef`.
2. Declare a signal input named after the selector and inject `TemplateRef` and `ViewContainerRef`.
3. Use an `effect()` so the view updates whenever the input changes.
4. In `Unless`, guard against duplicates by checking the container length before creating a view.
5. In `Times`, clear and recreate the views, passing `$implicit` (for `let i`) and `count` (for `let count = count`) in the context.
6. Optionally add `ngTemplateContextGuard` to type the context.
