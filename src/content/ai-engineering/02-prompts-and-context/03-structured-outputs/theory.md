# Structured Outputs

Most model calls in a product do not end on a screen; they end in code. A category drives a routing rule, an extracted amount goes into a database, a plan becomes a list of tool calls. Code needs **data with a known shape**, and a model produces **text**. Structured outputs are the techniques that close that gap, and none of them removes the need to validate.

## Four levels of strictness

| Level | How | What can still go wrong |
| --- | --- | --- |
| Instructions | "Reply with a JSON object `{ category, priority }`" in the prompt | prose around the JSON, code fences, trailing commas, single quotes, missing fields |
| JSON mode | a request flag that makes the output valid JSON | valid JSON with the wrong fields or types |
| Schema-constrained decoding | the provider receives a JSON Schema and only lets the model emit tokens that fit it | refusals, truncation at the token limit, unsupported schema features, values that fit the type but are wrong |
| Tool calling | the schema is a tool's parameters (module 03) | the same as above, plus unknown tools and invalid arguments |

Each level removes a class of errors and none removes all of them. Constrained decoding cannot make a refusal fit your schema, cannot finish an answer cut at `maxTokens`, and does not know that `orderId` must have four digits unless the schema says so, and some providers reject such constraints anyway. Your code validates every time.

## One schema, two jobs

Write the shape once, in code, with a schema library: **Zod** in TypeScript, **Pydantic** in Python. The same schema then:

1. **describes** the output to the model, converted to JSON Schema for the provider's structured output parameter;
2. **validates** the reply in your code and gives you a typed value.

```ts
import { z } from 'zod';

const Ticket = z.object({
  category: z.enum(['billing', 'shipping', 'account', 'bug']),
  priority: z.enum(['low', 'normal', 'high']),
  orderId: z.string().regex(/^\d{4}$/).nullable(),
  tags: z.array(z.string()).default([]),
});

const jsonSchema = z.toJSONSchema(Ticket);
const result = Ticket.safeParse(JSON.parse(text));
if (!result.success) console.log(z.prettifyError(result.error));
```

Use the **validated** value (`result.data`), not the raw parse: it carries defaults and transformations, and its type is guaranteed. `nullable()` beats an optional field that the model may omit or invent: ask for `null` when a value is absent, so "unknown" is explicit.

## Repair, re-ask, give up

When a reply does not validate, there are three moves, in order of cost:

1. **Repair locally** what is mechanical and unambiguous: extract the object from prose and fences, remove trailing commas, convert single quotes. It costs nothing and needs no second call.
2. **Re-ask with the error.** Send the conversation back with the bad reply as an assistant turn and a user turn that quotes the validation error ("`priority`: expected one of low, normal, high"). Models fix specific, located errors far more reliably than they follow "try again".
3. **Give up after a bounded number of attempts** with a typed error that carries the last problem. Two or three attempts is the usual budget; an unbounded loop multiplies cost when a prompt or schema is simply wrong.

Some outcomes skip the loop. A **refusal** or a content filter is a decision, not a format error: re-asking with "your JSON was invalid" is pointless and can look like pressure to comply. A **truncated** reply should not be repaired by guessing the missing tail; re-ask (perhaps with a higher `maxTokens` or a shorter requested output). **Errors** such as rate limits belong to the retry layer from module 01, not to this loop.

Do not repair by guessing values. Closing a truncated object or defaulting a missing required field produces data that *looks* valid and is wrong, which is worse than an error.

## Design schemas for models

- Keep them flat and small. Every field is a decision the model can get wrong.
- Use enums for closed sets and say in the prompt what each value means.
- Add `description`s; providers pass them to the model.
- Put a short `reasoning` field **before** the answer fields when the task needs thought: models generate fields in order.
- Version the schema with the prompt (lesson 06): a renamed field is a breaking change for every consumer.

Major APIs offer schema-constrained outputs, each supporting only a subset of JSON Schema, and refusals or output-limit cut-offs can still break the schema. Schema libraries convert their definitions to JSON Schema, and helper libraries wrap the validate-and-re-ask loop. Check your provider's supported subset before relying on a keyword.

## When to choose it

Use a schema and validation for every model output that code consumes, from the first prototype: it is the cheapest reliability you will ever buy. Turn on the provider's schema-constrained mode when available, because it removes most format failures, but keep validation, local repair and a bounded re-ask loop around it. Prefer plain text when the output goes straight to a human (a reply draft, a summary), and plain code when the "extraction" is deterministic, such as a date format or an order number a regular expression finds.
