## Formatting values in templates

A **pipe** transforms a value for display, right in the template, with the `|` operator:

```html
<p>{{ product().name | uppercase }}</p>
<p>{{ product().price | currency: 'EUR' }}</p>
<p>{{ createdAt() | date: 'MMM d, y, HH:mm' : 'UTC' }}</p>
```

Arguments follow the pipe name, separated by colons. Pipes can be chained: `{{ title() | slice: 0 : 10 | uppercase }}`.

### Built-in pipes

All live in `@angular/common`. In a standalone component you import the ones you use:

```ts
import { CurrencyPipe, DatePipe, UpperCasePipe } from '@angular/common';

@Component({
  selector: 'app-invoice',
  imports: [CurrencyPipe, DatePipe, UpperCasePipe],
  template: `...`,
})
export class Invoice {}
```

| Pipe | Example | Output (en-US) |
| --- | --- | --- |
| `uppercase` / `lowercase` / `titlecase` | `'ada lovelace' \| titlecase` | `Ada Lovelace` |
| `currency` | `1234.5 \| currency: 'EUR'` | `€1,234.50` |
| `number` (`DecimalPipe`) | `3.14159 \| number: '1.0-2'` | `3.14` |
| `percent` | `0.15 \| percent` | `15%` |
| `date` | `date \| date: 'shortDate'` | `3/14/26` |
| `slice` | `[1,2,3,4] \| slice: 1 : 3` | `[2,3]` |
| `json` | `obj \| json` | pretty JSON (debugging) |
| `keyvalue` | `@for (e of map \| keyvalue; track e.key)` | entries |
| `async` | `stream$ \| async` | latest emitted value (see the RxJS module) |

Locale-aware pipes (`currency`, `number`, `percent`, `date`) use `LOCALE_ID`, which defaults to `en-US`. Pass a timezone to `date` (`'UTC'`) when the output must not depend on the user's machine.

### Writing a custom pipe

```ts
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'initials' })
export class InitialsPipe implements PipeTransform {
  transform(fullName: string, max = 2): string {
    return fullName.split(' ').slice(0, max).map((part) => part[0]).join('');
  }
}
```

```html
{{ 'Grace Brewster Hopper' | initials }}      <!-- GB -->
{{ 'Grace Brewster Hopper' | initials: 3 }}   <!-- GBH -->
```

- The first `transform` parameter is the piped value; the rest are the colon arguments.
- Pipes are standalone by default: add the class to the component's `imports`.
- File naming follows the style guide: `initials-pipe.ts` exporting `InitialsPipe`.

### Pure vs impure

By default a pipe is **pure**: Angular calls `transform` again only when the input value (or an argument) changes by reference. This makes pipes very cheap, effectively memoized. Consequence: mutating an array (`items.push(x)`) does **not** re-run a pure pipe applied to it; create a new array instead (which signals encourage anyway).

`@Pipe({ name: 'x', pure: false })` makes a pipe impure: it runs on every change detection of the view. Only the `async` pipe and a few others need that. Avoid it for your own pipes.

### Pipes vs `computed()`

Both derive display values. Rules of thumb:

- **Pipe**: reusable formatting used in many templates (dates, money, truncation).
- **`computed()`**: component-specific derived state, or values you also need in TypeScript code.

## Legacy vs modern

- Legacy apps import `CommonModule` (all common pipes and directives at once) or declare pipes in an `NgModule`'s `declarations`.
- Older custom pipes have `standalone: true` (required before v19, the default since).
- Modern code imports exactly the pipe classes it uses, which helps tree-shaking and makes dependencies explicit.

## Pitfalls

- **Forgetting the import**: `No pipe found with name 'currency'` (NG0302).
- **Precedence**: the pipe operator binds more loosely than the ternary, so `a ? b : c | uppercase` means `(a ? b : c) | uppercase`. Use parentheses when you mean something else.
- **Side effects in `transform`**: pipes must be pure functions of their arguments.
- **Pipes in TypeScript code**: you can instantiate a pipe class (`new CurrencyPipe('en-US')`), but in components prefer `formatCurrency()` / `formatDate()` functions from `@angular/common`.
