## Who owns the value?

Every interactive component has a value: the text in an input, the open state of an accordion, the selected tab. The key design question is **who owns it**:

- **Uncontrolled**: the component (or the DOM) keeps the value itself. The parent can set an initial value and read the result later.
- **Controlled**: the parent keeps the value in its state and passes it down as a prop, together with a callback to request changes. The component never changes the value on its own.

## Form inputs: value vs defaultValue

For native inputs, React chooses the mode from the props you pass:

```jsx
<input value={email} onChange={(event) => setEmail(event.target.value)} />

<input name="email" defaultValue="ada@example.com" />
```

The first is **controlled**: React state is the single source of truth and every keystroke goes through `setEmail`. The second is **uncontrolled**: the DOM keeps the text, `defaultValue` only sets the initial value, and you read it when you need it, typically on submit:

```jsx
function handleSubmit(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  subscribe(data.get('email'));
  event.currentTarget.reset();
}
```

`defaultChecked` is the uncontrolled counterpart of `checked` for checkboxes and radios.

| | Controlled | Uncontrolled |
| --- | --- | --- |
| Source of truth | React state | DOM |
| Live validation, formatting, dependent fields | Easy | Harder |
| Re-renders per keystroke | Yes | No |
| Code needed | `value` + `onChange` | `name` + `defaultValue` + `FormData` |

Neither is "better". Uncontrolled forms are simpler and fast; React 19 form Actions and libraries such as React Hook Form build on them. Controlled inputs shine when the UI reacts to each keystroke.

## The classic warnings

- `value` without `onChange` makes a **read-only** input (React warns). Add `onChange`, use `readOnly`, or switch to `defaultValue`.
- Switching from `value={undefined}` to a string flips the input from uncontrolled to controlled, and React warns: "A component is changing an uncontrolled input to be controlled". Initialize state with `''`, never `undefined`.
- Changing `defaultValue` after mount does nothing: it is an initial value only. Use a `key` to reset the input.

## Your own components: supporting both modes

Well-designed components follow the same convention as native inputs: `value` + `onChange` for controlled use, `defaultValue` for uncontrolled use.

```jsx
function Stepper({ value, defaultValue = 0, onChange }) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? value : internalValue;

  const update = (next) => {
    if (!isControlled) {
      setInternalValue(next);
    }
    onChange?.(next);
  };

  return <button onClick={() => update(current + 1)}>{current}</button>;
}
```

- Decide the mode with `value !== undefined`, not truthiness: `0` is a valid controlled value.
- Always call `onChange`, in both modes, so parents can observe changes.
- In controlled mode, **do not** update internal state: the parent decides. If the parent ignores `onChange`, the value stays put, exactly like a native controlled input.
- Do not switch modes during the component's lifetime.

Many libraries extract this into a `useControllableState` hook (Radix UI, Chakra UI, React Aria).

## Legacy notes

- Class components read uncontrolled inputs with string refs (`this.refs.email.value`), removed in React 19. Use `FormData` or a ref.
- Before hooks, "controlled vs uncontrolled" was often decided with `getDerivedStateFromProps` to copy props into state, a source of subtle bugs. The `isControlled` check above is simpler and has no sync step.

## Choosing

- Parent needs to **set** the value at any time (reset button, URL sync, dependent fields): controlled.
- Parent only needs the **final** value: uncontrolled with `defaultValue`.
- Reusable library component: support both.
