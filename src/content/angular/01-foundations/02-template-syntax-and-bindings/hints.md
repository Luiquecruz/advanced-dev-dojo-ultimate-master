Text goes through interpolation: `{{ name() }}`. Everything else is a binding in square brackets on the element itself.
---
Properties use `[src]="..."`, attributes without a DOM property use the `attr.` prefix: `[attr.aria-valuenow]="..."`.
---
Toggle one class with `[class.online]="isOnline()"` and set a style with a unit suffix: `[style.width.%]="progress()"`. The status text can be a ternary inside `{{ }}`.
