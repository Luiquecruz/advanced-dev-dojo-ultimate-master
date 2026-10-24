Turn `SignupForm` into a fully **controlled** form. It receives an `onSubmit(data)` prop.

Fields (labels are given with `aria-label` in the starter):

| Label | Element | Initial state |
| --- | --- | --- |
| `Name` | text input | `''` |
| `Username` | text input | `''` |
| `Plan` | `<select>` with options `free` and `pro` | `'free'` |
| `I accept the terms` | checkbox | `false` |

Requirements:

1. Every field is controlled: `value` (or `checked`) comes from state and `onChange` updates it.
2. The `<p className="greeting">` shows `Hello, <name>!` using the trimmed name, or `Hello, stranger!` when the name is blank. It updates while typing.
3. The **Username** is normalized as the user types: lowercase, with all whitespace removed (`Ada Lovelace` → `adalovelace`).
4. The `Sign up` button is **disabled** until the name is not blank, the username is not empty and the terms are accepted.
5. Submitting prevents the reload and calls `onSubmit({ name, username, plan, acceptedTerms })` with the trimmed name.
