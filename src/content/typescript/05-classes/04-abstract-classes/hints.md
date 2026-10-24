Write `abstract class Report`, then replace the field with `abstract readonly format: string;` and the throwing method with `protected abstract renderBody(items: string[]): string;` (no body).
---
Each subclass needs `readonly format = '...'` and a `protected renderBody(items: string[]): string { ... }` implementation.
---
`` items.map((item, index) => `${index + 1}. ${item}`).join('\n') `` builds the numbered list.
