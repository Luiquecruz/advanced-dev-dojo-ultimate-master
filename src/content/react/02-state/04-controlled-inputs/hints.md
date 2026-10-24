Declare one state variable per field: `const [name, setName] = useState('')`, and the same for `username`, `plan` (`'free'`) and `acceptedTerms` (`false`).
---
Wire each field: `value={name} onChange={(event) => setName(event.target.value)}`. For the checkbox use `checked={acceptedTerms}` and read `event.target.checked`. The `<select>` also takes `value` and `onChange`.
---
Normalize inside the username handler: `setUsername(event.target.value.toLowerCase().replace(/\s+/g, ''))`. Then derive `const canSubmit = name.trim() !== '' && username !== '' && acceptedTerms;` and use `disabled={!canSubmit}`.
