# Long-Term Memory

Conversation memory ends with the session. **Long-term memory** survives it: the assistant that remembers next month that you are allergic to peanuts, prefer aisle seats and already tried restarting the router. It is a small database the application writes to and reads from around model calls, and like any database it needs two policies: what goes in (**write policy**) and what comes out for a given call (**read policy**).

## The write path: extract, filter, deduplicate

Raw transcripts are a poor memory: long, repetitive, full of small talk. Most systems **extract** short, self-contained statements with a model ("The user is allergic to peanuts") and store those, often keeping a pointer to the source conversation.

```ts
const response = await model.generate({ messages: [extractionPrompt, conversation], responseFormat: { type: 'json' } });
```

Extraction is model output, so validate it like any structured output (module 02): parse defensively, drop items with missing text or an importance outside the allowed range, and treat a refusal or malformed JSON as "nothing to remember" rather than an exception that breaks the chat. Provider errors are different: let them through so the caller can retry the job.

Then a **write policy** decides what is worth keeping. Good policies are mechanical and testable:

- **Importance threshold.** The extractor rates each memory (the Generative Agents paper asked for a 1–10 "poignancy" score); trivia below a threshold is skipped.
- **Shape rules.** A memory is a statement, not a fragment or a question.
- **Exclusions.** Secrets, payment data and anything the product promises not to remember (lesson 06).

Finally **deduplicate**. Users repeat themselves, and a store with fifteen copies of "prefers aisle seats" wastes retrieval slots. Embed the new memory, find the most similar existing one, and if the similarity is above a threshold, **merge**: keep the existing id and creation time, take the newer wording, keep the higher importance, and refresh its last access. Below the threshold, add a new memory. The threshold is a tuning knob: too low and different facts merge ("lives in Lisbon" and "lives in Porto" share most words), too high and duplicates pile up. Merging by similarity cannot tell an update from a contradiction; when facts change over time, the next lesson's temporal graph handles it explicitly. Systems such as Mem0 let a model choose between add, update, delete and no-op for each candidate; the threshold rule is the deterministic baseline.

Writes can happen **in the hot path** (during the reply, visible to the user, adds latency) or **in the background** after the session or on a schedule (no latency, but other sessions see the memory later).

## The read path: relevance, recency, importance

Retrieving by similarity alone is the RAG reflex, and it misses two things memory needs: a fact mentioned yesterday usually matters more than one from last year, and a peanut allergy matters more than a favorite color even when the query is only loosely related. The **Generative Agents** paper (Park et al., 2023) scores each memory with three components:

| Component | Computed as | In the challenge |
| --- | --- | --- |
| Relevance | cosine similarity between the query and memory embeddings | `max(0, cosine)` |
| Recency | exponential decay since the memory was **last accessed** | `decayPerHour ** hoursSinceLastAccess` |
| Importance | the score given at write time | `importance / 10` |

```ts
const score = weights.relevance * relevance + weights.recency * recency + weights.importance * importance;
```

The paper rescales each component across the candidates (min-max) and uses equal weights; the challenge keeps each component in `[0, 1]` and makes the weights configurable, because the right balance is product-specific and should be tuned on your own eval set. Recency decays per hour with a factor such as `0.995`: after 24 hours a memory keeps about 89% of its recency score, after a month about 3%. Because recency is measured from the **last access**, retrieving a memory refreshes it, so memories that keep being useful stay easy to find while unused ones fade without being deleted.

Return the top *k* and keep *k* small: memories compete for the same token budget as the conversation and retrieved documents.

## Pitfalls

- Storing raw transcripts instead of extracted statements.
- Trusting extraction output without validation, or crashing the chat when it is malformed.
- No deduplication, so the top results are copies of one fact.
- A duplicate threshold so low that different facts merge.
- Ranking by similarity only, so a critical old fact loses to a trivial recent one, or the reverse.
- Measuring recency from creation instead of last access.

> **Status as of October 2026:** dedicated memory layers include Mem0, Zep and Letta; agent frameworks such as LangGraph (with LangMem) provide memory stores, and some model APIs offer a client-side memory tool (for example Anthropic's file-based memory tool). Consumer assistants ship user-visible memory with controls to view and delete it. Published comparisons (on benchmarks such as LoCoMo and LongMemEval) suggest simple approaches, even a file system the agent searches, are often competitive with specialized memory systems.

## When to choose it

Add long-term memory when users return across sessions and repeating themselves is a real cost: assistants, tutors, support for known customers. Start with extracted statements in a vector or plain store, a mechanical write policy, deduplication and three-part scoring; measure on questions your users actually ask. Skip it when every session is independent, when the facts already live in your product database (read the user's profile instead of "remembering" it), or when you cannot yet meet the privacy duties that stored memories bring.
