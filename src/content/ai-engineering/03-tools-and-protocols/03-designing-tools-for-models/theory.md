# Designing Tools for Models

A tool is an API whose only user is a model. The model cannot read your source code, ask a colleague or open the docs: it sees a name, a description, a parameter schema, and later the text your tool returns. Anthropic calls this surface the **agent-computer interface** and argues it deserves as much design effort as a human interface. Most "the agent chose the wrong tool" bugs are interface bugs.

## Names and descriptions are prompts

- **Name** tools by what they do, in one consistent style: `search_orders`, `get_order`, `refund_order`. Avoid overlapping pairs (`search` and `find`) that force the model to guess.
- **Describe** what the tool returns and when to use it, in a sentence or two: *"Find a customer's orders by the email used at checkout, most recent first. Returns id, status, total and date."* Mention formats (`A-1234`), units and limits.
- **Describe every parameter.** `status` alone is ambiguous; "Only return orders in this status. Omit to include every status." is not.
- **Prefer fewer, higher-level tools.** One `schedule_meeting` that finds a free slot beats `list_calendars`, `list_events` and `create_event` the model must orchestrate correctly every time.

## One schema, two jobs

Write the argument schema once and derive the rest from it. With Zod, the same object validates at runtime and generates the JSON Schema the model reads:

```ts
const searchOrdersInput = z
  .object({
    customerEmail: z.email().describe('Email address the customer used at checkout.'),
    limit: z.number().int().min(1).max(20).default(5).describe('Maximum orders to return, most recent first.'),
  })
  .strict();

const parameters = z.toJSONSchema(searchOrdersInput, { io: 'input' });
```

Constrain what you can: enums instead of free strings, integer ranges, `additionalProperties: false`. Every constraint the schema expresses is one the model is more likely to respect and one your validator enforces anyway. Keep it lean, though: the full schema is sent on every request, so a long generated regex or a deep nested object costs tokens each time.

## Errors written for the model

When a call is wrong, the tool's reply is the model's only feedback. Compare:

```text
Error: invalid input
```

```text
Error: invalid arguments for search_orders.
- customerEmail: Invalid input: expected string, received undefined
- status: Invalid option: expected one of "pending"|"shipped"|"delivered"|"cancelled"
```

The second names every invalid field and the allowed values, so the model fixes everything in one retry. Two more rules:

- **Expected failures carry a next step.** "No customer with the email ada@exmaple.com. Hint: ask the customer to confirm the address." turns a dead end into a question for the user.
- **Unexpected failures hide their details.** A raw exception can contain hostnames, credentials, SQL or stack traces. Log it for engineers; tell the model only that the tool failed and what to do (retry later, apologize to the user).

Distinguish "nothing matched" from "this does not exist". An empty result for a valid filter is a correct answer; an unknown customer is an error the model must act on.

## Outputs: minimal, ordered, honest

Tool output becomes context for every later call in the conversation, so it costs tokens again and again.

- Return **only the fields the next decision needs**. Internal ids, payment tokens and audit notes waste tokens and can leak into an answer.
- **Order** results by relevance or recency, and **cap** them with a sensible default.
- **Say when you cut**: a `total`, a `truncated` flag and a hint ("filter by status or raise limit") keep the model from assuming it saw everything. For large sets, offer pagination with a cursor.
- Prefer **meaningful values over opaque ids** when the model must reason about them (`"status": "shipped"`, not `"status_id": 3`).

## Design for retries and side effects

Models retry, and harnesses replay steps after failures. Read tools are naturally safe; **write tools** (refunds, emails, deletes) need an idempotency key or a check that the action already happened, and usually a human approval step in your application (module 08). Mark which tools are read-only so the harness can treat them differently.

## Pitfalls

- Thin wrappers over every REST endpoint: dozens of low-level tools the model must chain perfectly.
- Descriptions copied from internal docs that assume context the model does not have.
- Validation errors that say "invalid" without naming the field.
- Returning whole database rows, or silently truncating lists.
- Testing tools only with unit tests. Evaluate them with a model too: run realistic tasks and read the transcripts to see where it hesitates or misuses a tool.

Model APIs accept JSON Schema for tool parameters, and MCP tools declare an `inputSchema` and an optional `outputSchema`. Some providers reject or ignore parts of JSON Schema (formats, patterns, `$ref`) in strict modes, so check the provider's supported subset before relying on a keyword.

## When to choose it

Apply these rules to every tool a model can call; the effort is small compared with debugging wrong tool choices in production. Invest the most in tools the model calls often or that have side effects. When a capability is deterministic and always needed, skip the tool and compute the value yourself before the call. When you must expose many tools, first consolidate them into fewer, higher-level ones; lesson 06 covers what to do when that is still too many.
