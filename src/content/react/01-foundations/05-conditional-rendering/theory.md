## Conditions are just JavaScript

JSX has no `v-if` or `*ngIf`. You use plain JavaScript to decide what to render. There are four common tools.

### 1. `if` with early return

Best for "completely different output" cases, such as loading, errors or permissions:

```jsx
function Dashboard({ user }) {
  if (!user) {
    return <p>Please sign in.</p>;
  }
  return <h1>Hello, {user.name}</h1>;
}
```

Returning **`null`** renders nothing: `if (!isOpen) return null;`.

### 2. Ternary `? :` inside JSX

Best for "this or that" in the middle of markup:

```jsx
<p>{isOnline ? 'Online' : 'Offline'}</p>
<button>{isSaving ? <Spinner /> : 'Save'}</button>
```

### 3. Logical AND `&&`

Best for "this or nothing":

```jsx
{hasError && <p role="alert">Something went wrong.</p>}
```

If the left side is falsy, the expression returns that falsy value. `false`, `null` and `undefined` render nothing, but **`0` and `NaN` render as text**.

### 4. Variables

When the condition logic gets bigger, compute the element first:

```jsx
let content;
if (status === 'loading') content = <Spinner />;
else if (status === 'error') content = <ErrorBox />;
else content = <Results items={items} />;

return <section>{content}</section>;
```

## The `0` pitfall

This is the most common conditional rendering bug in React:

```jsx
// 🔴 renders "0" when the list is empty
{messages.length && <Badge count={messages.length} />}
```

`messages.length && ...` evaluates to `0`, and React prints numbers. Make the left side a real boolean:

```jsx
{messages.length > 0 && <Badge count={messages.length} />}
{Boolean(messages.length) && <Badge count={messages.length} />}
{messages.length ? <Badge count={messages.length} /> : null}
```

The same applies to `NaN` and empty strings in some cases. If a value can be a number, compare explicitly.

## Conditional attributes and classes

Conditions work in attributes too:

```jsx
<li className={isDone ? 'item done' : 'item'}>
<button disabled={!canSubmit}>Send</button>
<input aria-invalid={hasError || undefined} />
```

An attribute set to `undefined` or `null` is omitted from the DOM. Libraries such as `clsx` help build class strings (`clsx('item', { done: isDone })`).

## Pluralization

UI text often depends on a count. A simple ternary is enough for English:

```jsx
<p>{count} {count === 1 ? 'item' : 'items'}</p>
```

For real internationalization, use `Intl.PluralRules` or an i18n library.

## Hiding vs not rendering

Conditionally rendering a component **unmounts** it: its DOM is removed and its state is lost. If you need to keep state while hidden, render it and hide it with CSS (`hidden` attribute or a class), or use React 19.2's `<Activity mode="hidden">`, covered later.

## Pitfalls

- `&&` with numbers prints `0`.
- Deeply nested ternaries become unreadable. Extract a variable or a small component.
- Statements are not allowed inside braces: `{if (x) ...}` is a syntax error. Use a ternary or move the `if` above the `return`.
