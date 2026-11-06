# Map: Prompt and Context Engineering

Module 01 treated the model as a black box you call, pay for and protect against failures. This module opens the request: **what does the model see on each call, in what shape, and what comes back?** The same model can be excellent or useless depending on the answer, and most of that answer is ordinary, testable code.

## The question this module answers

Every call sends a context and receives an output. Between them sit decisions that do not depend on which model you picked:

- How is the prompt structured, and where does untrusted data go?
- How does free text become data your code can trust?
- Which examples does the model see, and how many?
- What fits in the context window, and what is left out on purpose?
- How do prompts change safely once they serve real users?
- How do caching and batching change the bill for the same prompts?

## The layer

This is **layer 2, context**: what the model sees on each call. Module 02 covers the prompt itself, structured output and the context budget. Later modules feed the same layer with other sources: retrieval (module 04), knowledge graphs (module 05) and memory (module 06). The builder you write here is the place those sources plug into.

| Layer | This module adds |
| --- | --- |
| 1. Model | output reserve and caching depend on the model's window and pricing |
| 2. Context | prompt anatomy, examples, context budget, prompt layout for caching |
| 5. Evaluation | tests per prompt, a first step toward the evals of module 10 |
| 6. Governance | versioned prompts and rollback, an audit trail of what ran |

## Prerequisites

Module 01, especially calling a model through your own thin layer (lesson 03), tokens, cost and latency (lesson 04) and retries (lesson 06). From the Node.js track: TypeScript, async functions and schema validation with Zod.

## The path

| # | Lesson | Kind | You build or decide |
| --- | --- | --- | --- |
| 02 | Prompt anatomy | challenge | a message builder with roles, constraints, examples and safe delimiters |
| 03 | Structured outputs | challenge | schema validation with Zod, local repair, re-ask with the error, bounded attempts |
| 04 | Choosing examples | challenge | few-shot examples selected by similarity, deduplicated, within a token budget |
| 05 | Context engineering | challenge | a context builder under a token budget: select, compress, order, drop |
| 06 | Prompts as code | challenge | a versioned prompt registry with tests, promotion and rollback |
| 07 | Caching and batching | quiz | stable prefixes, batch APIs, the risks of semantic caching |
| 08 | Prompt and context ADR | checkpoint | a decision record and prompt plan for a claim-extraction feature |

Each challenge runs against the fake model. It produces every malformed JSON shape, varying phrasings, refusals and truncation, so your code is graded on how it handles them, not on what a particular model happens to write.

## Ideas that run through the module

- **A prompt is a document with parts**, not a magic sentence. Structure makes it reviewable, testable and safe to change.
- **Text in, data out.** Anything code consumes gets a schema, validation and a bounded retry, whatever the provider promises.
- **Context is a budget.** More tokens cost money and latency and can make answers worse (context rot); choose what goes in.
- **Prompts are code.** Version them, test them, release them deliberately and keep a way back.
- **Not everything needs a model.** Dates, arithmetic, sorting and validation belong in plain code, which is cheaper, faster and right every time.

## The ADR at the end

The module closes with a checkpoint: for a briefing with volumes, latency budgets, accuracy targets, context sizes and a backfill budget, you write an ADR and a prompt plan. Tests check that your choices are coherent with the numbers: the attempt limit fits the latency, the cached prefix contains only stable parts, the backfill fits its budget.

Providers offer schema-constrained outputs, prompt caching and discounted batch processing, but their parameters and prices differ and change, so check your provider's documentation for them.

## When to choose it

Take this module before any module that adds context sources (retrieval, memory) or loops (agents): they all assume you can build a prompt, validate its output and keep its context within budget. If you already ship prompts in production, go straight to the ADR; if the attempt limit, the cache breakpoint or the backfill mode is not obvious from the numbers, work through lessons 03, 05 and 07 first.
