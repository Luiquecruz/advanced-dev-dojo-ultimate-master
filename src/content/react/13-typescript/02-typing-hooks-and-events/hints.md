Write the types first: `export type Action = { type: 'added'; title: string } | { type: 'toggled'; id: number } | { type: 'cleared' };` and annotate the reducer `(state: Todo[], action: Action): Todo[]`.
---
Inside `switch (action.type)`, each `case` narrows `action`, so `action.title` is available only in `'added'`. In `default`, write `const unreachable: never = action; return unreachable;`.
---
For the component: `const inputRef = useRef<HTMLInputElement>(null);`, `function handleChange(event: ChangeEvent<HTMLInputElement>)` and `function handleSubmit(event: SubmitEvent<HTMLFormElement>)`. After dispatching, call `setTitle('')` and `inputRef.current?.focus()`.
