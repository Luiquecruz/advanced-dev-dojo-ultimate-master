## pattern: Report is declared abstract

```regex
abstract\s+class\s+Report\b
```

## type: Report cannot be instantiated and subclasses must implement renderBody

```ts
// @ts-expect-error Report is abstract
new Report('Nope');
// @ts-expect-error renderBody is missing
class Incomplete extends Report { readonly format = 'incomplete'; }
const report: Report = new MarkdownReport('Ok');
```

## type: renderBody is not callable from outside

```ts
const report = new NumberedReport('Steps');
// @ts-expect-error renderBody is protected
report.renderBody(['a']);
```

## runtime: MarkdownReport renders bullet points

```js
const report = new MarkdownReport('Groceries');
assert.equal(report.format, 'markdown');
assert.equal(report.render(['Milk', 'Eggs']), '# Groceries (markdown)\n- Milk\n- Eggs');
```

## runtime: NumberedReport renders numbered lines

```js
const report = new NumberedReport('Steps');
assert.equal(report.format, 'numbered');
assert.equal(report.render(['Plan', 'Build', 'Ship']), '# Steps (numbered)\n1. Plan\n2. Build\n3. Ship');
assert.ok(report instanceof Report);
```
