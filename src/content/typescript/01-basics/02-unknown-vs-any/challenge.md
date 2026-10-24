Implement `describeValue(value: unknown): string`:

- strings return `"text(<length>)"`, e.g. `describeValue("hey")` → `"text(3)"`
- numbers return `"number(<value>)"` with the value doubled, e.g. `describeValue(21)` → `"number(42)"`
- anything else returns `"other"`

The parameter must stay typed as `unknown`, and `any` is not allowed.
