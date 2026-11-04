Design a tool the way a model needs it: a precise schema, errors it can act on and an output with nothing it does not need. You build a generic `define_tool` helper, then use it for `search_orders`, a lookup over the seeded orders in `orders.py`.

Python's standard library has no Zod or Pydantic, so `schema.py` (already written) plays their role: one declaration both validates the arguments and produces the JSON Schema the model reads.

| `schema.py` | What it does |
| --- | --- |
| `Object(fields, strict=False)` | an object; `fields` is a dict of field name → schema; `strict=True` rejects unknown keys |
| `String(min_length=None)`, `Email()`, `Integer(minimum=None, maximum=None)`, `Enum(values)` | field schemas |
| `description=`, `default=`, `optional=True` | keyword options of every schema |
| `schema.safe_parse(value)` | a `ParseResult` with `success`, `data` (defaults applied) and `issues`, each an `Issue` with `path` (a list of keys) and `message`; never raises |
| `to_json_schema(schema)` | the JSON Schema as a dict, starting with a `"$schema"` key; fields with a default are not required |

## 1. `ToolError`

Already written: an exception with a message and an optional `hint` attribute. Tools raise it for failures the model can fix.

## 2. `define_tool(name, description, input, run)`

`input` is an `Object` schema; `run(arguments)` receives the parsed arguments dict and returns a value (or a coroutine that resolves to one). Return a `DefinedTool` (already written) with:

- **`definition`**: `{"name": name, "description": description, "parameters": parameters}`, where `parameters` is `to_json_schema(input)` without its `"$schema"` key.
- **`call`**: an `async` function that takes the raw JSON string from a tool call and returns the text sent back to the model. It never raises:
  1. Text that is not valid JSON → a message starting with `Error` that names the tool.
  2. Arguments that fail the schema (`safe_parse`) → a message starting with `Error` that names the tool, followed by **one line per issue**: `- <path>: <message>`, where `<path>` is the issue path joined with `.` (`(root)` when empty). The tool does not run.
  3. `run` raises a `ToolError` → `Error: <message>`, plus a line `Hint: <hint>` when it has one.
  4. `run` raises anything else → a message starting with `Error` that names the tool and **does not** include the original exception message or a traceback (they may leak internals).
  5. Success → a string result as is; any other value as `json.dumps(value)`.

## 3. `search_orders_input` and `search_orders`

`search_orders_input` is a **strict** `Object` (unknown keys are rejected) where every field has a `description` of at least 10 characters:

| Field | Rule |
| --- | --- |
| `customerEmail` | required, an email (`Email()`) |
| `status` | optional, one of `pending`, `shipped`, `delivered`, `cancelled` |
| `limit` | optional integer from 1 to 20, default 5 |

`search_orders = define_tool(name="search_orders", description=..., input=search_orders_input, run=find_orders)`, with a description of at least 60 characters that says what it returns and when to use it. `find_orders(arguments)`:

- compares emails case-insensitively; when the customer has no orders at all, raises a `ToolError` whose message contains the email and that has a hint;
- keeps the orders matching `"status"` (when given), most recent `"placedAt"` first;
- returns `{"orders": ..., "total": ..., "truncated": ...}`: the first `limit` orders with **only** `"id"`, `"status"`, `"total"` and `"placedAt"`; `"total"` is the number of matching orders; `"truncated"` tells whether some were left out. When truncated, add a `"hint"` that suggests filtering by `status` or raising `limit`.

Internal fields (`"paymentToken"`, `"warehouseId"`, `"internalNotes"`) must never reach the model. Data keys keep the JSON names (camelCase); functions use Python names (snake_case).
