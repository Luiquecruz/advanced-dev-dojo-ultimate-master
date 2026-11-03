# Choosing Examples

Examples are the most powerful part of a prompt and the easiest to get wrong. A model copies what it sees: the format, the length, the tone, the label distribution, and the mistakes. Two well-chosen examples often fix what a page of instructions could not; five badly chosen ones teach the model to answer every ticket with "billing".

## Zero-shot, few-shot, many-shot

- **Zero-shot**: instructions only. Enough for tasks the model already does well, such as summarizing or translating.
- **Few-shot**: a handful of input/output pairs before the real input. The classic fix for a custom format, a house style or fuzzy category boundaries.
- **Many-shot**: dozens or hundreds of examples in a long context. It can approach fine-tuning quality for some tasks, at a cost on every call (lesson 07 shows how caching softens it).

Present examples as real conversation turns (a user message with the input, an assistant message with the output) or as clearly delimited blocks. Either way, format them exactly like the real request, so the pattern the model continues is the one you want.

## Static or dynamic

A **static** set is written once and sent with every request. It is simple, cacheable and easy to review, and it is the right start. Its weakness is coverage: three examples cannot show every kind of ticket.

**Dynamic selection** keeps a larger **pool** of labeled examples and picks, for each request, the ones most similar to its input. Research on in-context learning found that semantically similar examples beat random ones, sometimes by a wide margin, and the technique has become standard wherever a pool exists: support tickets labeled by agents, past extractions corrected by humans, accepted code reviews.

```ts
const queryVector = embed(query);
const ranked = pool
  .map((example) => ({ example, score: cosineSimilarity(queryVector, embed(example.input)) }))
  .sort((left, right) => right.score - left.score);
```

An **embedding** turns text into a vector so that texts with similar meaning point in similar directions; **cosine similarity** measures the angle between two vectors (1 means same direction). Real embedding models capture meaning; the fake model's `embed` is a bag-of-words stand-in where shared words drive similarity, which is enough to practice the mechanics. In production you embed the pool once, store the vectors, and only embed the query per request (module 04 builds that index).

## Rules for a good selection

1. **Relevance first.** Rank by similarity to the input.
2. **A floor.** Below some similarity, an example is noise; sending none beats sending misleading ones.
3. **No near-duplicates.** Three copies of the same ticket waste tokens and over-weight one pattern. Skip a candidate that is too similar to one already chosen; this also gives some **diversity**, which matters most when the pool is lopsided.
4. **A budget.** Cap by count and by tokens. A long example that does not fit should not block a short one that does.
5. **Order deliberately.** Models weigh what is closest to the question more; put the most similar example last.
6. **Watch the label balance.** If every selected example has the same label, the model tends to repeat it. Check the distribution in your evals.

Selection is plain, deterministic code. Test it like any ranking function, and log which example ids each request used: when an answer is wrong, the examples are the first suspect.

## Pitfalls

- Examples whose format differs from the instructions.
- Leaking the answer: in an eval, the test item itself sits in the pool and gets selected.
- Mislabeled pool entries, copied faithfully by the model.
- Unbounded example blocks that crowd out the context that matters.
- A pool that is never refreshed while the product changes.
- Dynamic examples placed before a static system prompt in a way that breaks the cacheable prefix (lesson 07): keep the static parts first.

> **Status as of October 2026:** frameworks ship example selectors (LangChain's semantic similarity and max marginal relevance selectors, for instance) and prompt optimizers such as DSPy choose demonstrations automatically against a metric. Many-shot prompting with hundreds of examples became practical with context windows of hundreds of thousands of tokens and prompt caching.

## When to choose it

Start zero-shot. Add a small static set when the format or the category boundaries keep going wrong; most features stop there. Move to dynamic selection when you have a labeled pool of at least dozens of examples, inputs vary widely, and evals show that static examples miss whole groups of inputs. Consider many-shot when the task is narrow, the pool is large and caching keeps the repeated prefix cheap, and consider fine-tuning (module 11) when even many examples do not get you there or the per-call token cost dominates.
