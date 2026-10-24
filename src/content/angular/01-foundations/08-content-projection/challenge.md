Write the template of the `Panel` component in `panel.ts` (selector `app-panel`). Keep the structure below and place three `<ng-content>` slots:

```html
<section class="panel">
  <header class="panel-header"><!-- slot 1 --></header>
  <div class="panel-body"><!-- slot 2 --></div>
  <footer class="panel-footer"><!-- slot 3 --></footer>
</section>
```

1. **Header**: elements with the attribute `panel-title`.
2. **Body**: everything else (the default slot).
3. **Footer**: elements with the attribute `panel-actions`. When nothing is projected there, show the fallback text `No actions`.

`App` in `app.ts` already uses two panels, one with actions and one without.
