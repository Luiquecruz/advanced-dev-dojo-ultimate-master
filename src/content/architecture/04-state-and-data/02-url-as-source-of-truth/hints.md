Write one small parser per field type, each taking `(rawValues, field)` where `rawValues` is `searchParams.getAll(key)`, and pick it with `definition[key].type`. Every parser returns `field.default` when its input does not pass.
---
For numbers, test the raw string with `/^-?\d+$/` before calling `Number`: `Number('')` is `0` and `Number('2.5')` is a valid number, neither is a valid page. Then compare with `field.min ?? -Infinity` and `field.max ?? Infinity`. For lists, `[...new Set(values)].sort()` gives the canonical order both `parse` and `serialize` need.
---
In `serialize`, loop over `Object.keys(definition).sort()`, skip a key when the value is `undefined` or equals the default (compare lists by their sorted items), `append` each list item and `set` the rest with `String(value)`.
---
In the hook: `const [searchParams, setSearchParams] = useSearchParams()`, `const state = useMemo(() => schema.parse(searchParams), [schema, searchParams])`. In `setState`, build `{ ...state, ...partial }`, remove `page` when `partial` has none (`serialize` then omits it), and call `setSearchParams(schema.serialize(nextState), navigateOptions)`. In the page, pass `{ replace: true }` as the second argument of the search input update.
