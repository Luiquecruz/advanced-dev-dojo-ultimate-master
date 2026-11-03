Design a tool the way a model needs it: a precise schema, errors it can act on and an output with nothing it does not need. You build a generic `defineTool` helper with Zod, then use it for `search_orders`, a lookup over the seeded orders in `orders.ts`.

## 1. `ToolError`

Exported (already written): an error with a `message` and an optional `hint`. Tools throw it for failures the model can fix.

## 2. `defineTool({ name, description, input, run })`

`input` is a Zod schema; `run(args)` receives the parsed arguments and returns a value (or a promise of one). Return `{ definition, call }`:

- **`definition`**: `{ name, description, parameters }`, where `parameters` is `z.toJSONSchema(input, { io: 'input' })` without its `$schema` key (`io: 'input'` keeps fields with defaults optional).
- **`call(rawArguments)`**: takes the raw JSON string from a tool call and resolves to the text sent back to the model. It never throws:
  1. Text that is not valid JSON → a message starting with `Error` that names the tool.
  2. Arguments that fail the schema (`safeParse`) → a message starting with `Error` that names the tool, followed by **one line per issue**: `- <path>: <message>`, where `<path>` is the issue path joined with `.` (`(root)` when empty). The tool does not run.
  3. `run` throws a `ToolError` → `Error: <message>`, plus a line `Hint: <hint>` when it has one.
  4. `run` throws anything else → a message starting with `Error` that names the tool and **does not** include the original error message or a stack trace (they may leak internals).
  5. Success → a string result as is; any other value as `JSON.stringify(value)`.

## 3. `searchOrdersInput` and `searchOrders`

`searchOrdersInput` is a **strict** Zod object (unknown keys are rejected) where every field has a `.describe()` of at least 10 characters:

| Field | Rule |
| --- | --- |
| `customerEmail` | required, an email (`z.email()`) |
| `status` | optional, one of `pending`, `shipped`, `delivered`, `cancelled` |
| `limit` | optional integer from 1 to 20, default 5 |

`searchOrders = defineTool({ name: 'search_orders', description, input: searchOrdersInput, run })`, with a description of at least 60 characters that says what it returns and when to use it. `run`:

- compares emails case-insensitively; when the customer has no orders at all, throws a `ToolError` whose message contains the email and that has a hint;
- keeps the orders matching `status` (when given), most recent `placedAt` first;
- returns `{ orders, total, truncated }`: the first `limit` orders with **only** `id`, `status`, `total` and `placedAt`; `total` is the number of matching orders; `truncated` tells whether some were left out. When truncated, add a `hint` that suggests filtering by `status` or raising `limit`.

Internal fields (`paymentToken`, `warehouseId`, `internalNotes`) must never reach the model.
