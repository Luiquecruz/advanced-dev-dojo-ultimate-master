`Report` currently fakes an abstract method by throwing at runtime. Turn it into a real abstract class and
implement two subclasses.

1. Make `Report` an **`abstract class`** with:
   - `abstract readonly format: string`
   - `protected abstract renderBody(items: string[]): string`
   - the existing concrete `render(items)` method, unchanged
2. `class MarkdownReport extends Report` — `format` is `"markdown"`; each item becomes `- item`, joined
   with `\n`.
3. `class NumberedReport extends Report` — `format` is `"numbered"`; each item becomes `<n>. item`
   starting at `1`, joined with `\n`.

```ts
new MarkdownReport('Groceries').render(['Milk', 'Eggs']);
// "# Groceries (markdown)\n- Milk\n- Eggs"
new NumberedReport('Steps').render(['Plan', 'Ship']);
// "# Steps (numbered)\n1. Plan\n2. Ship"
```
