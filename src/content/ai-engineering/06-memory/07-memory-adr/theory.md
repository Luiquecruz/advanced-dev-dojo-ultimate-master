# Checkpoint: the Memory ADR

This module built memory piece by piece: the vocabulary of memory types, a conversation window with a running summary, a long-term store with write and read policies, a temporal graph for facts that change, and the isolation, provenance, retention and erasure rules that keep memory safe. The checkpoint turns them into one decision for one product: an **Architecture Decision Record** for the memory of a feature, plus a **memory plan** that a teammate could implement and a privacy reviewer could check.

A memory ADR is rarely "we add a vector database". It answers six questions, each with a fact from the briefing behind it.

## The decision checklist

1. **Which memories?** Name the types (working, episodic, semantic, procedural) the product needs, from the questions users actually ask. Decide who may change procedural memory; behavior that changes for everyone should not change without review.
2. **What does one call see?** Set the token budget for memory, split it between the conversation and retrieved long-term memories, and pick a conversation strategy that survives the longest session. Remember that the latest turns are never negotiable.
3. **Where do long-term memories live?** A file, a vector store or a temporal graph. Decide with eval numbers on your own question kinds, not with the most advanced option: a graph earns its cost only when time or relations matter.
4. **How are they ranked?** Weights for relevance, recency and importance, and a top-k that fits the budget.
5. **Who owns them?** Isolation per user (or per tenant), provenance on every memory, and a rule for instruction-like content from untrusted sources.
6. **When do they go?** Retention per memory, purging, and an erasure process that reaches summaries, extracted facts, embeddings and caches within the promised time.

| Option | Buys | Costs |
| --- | --- | --- |
| No long-term memory | nothing to secure, expire or delete | users repeat themselves across sessions |
| Files or a profile document | simple, inspectable, cheap | weak retrieval at scale, no notion of time |
| Vector store of extracted memories | good for preferences and loose facts | stale answers when facts change |
| Temporal graph | correct answers about change and past states | extraction, entity resolution, contradiction rules, latency |

## Writing the ADR well

- **Context** lists the forces with numbers: users, session length, token budget, question kinds and their eval results, untrusted inputs, retention and erasure commitments.
- **Decision** is one sentence starting with "We will", naming the conversation strategy, the long-term store, isolation and retention.
- **Alternatives** are the options someone will propose later ("just send the whole history", "a vector store is enough", "one memory per account"), each with the fact that rules it out.
- **Consequences** have two sides. A temporal graph answers time questions but makes extraction a critical component; strict refusal of untrusted instructions stops poisoning but can drop a legitimate fact.

## Example: a language-learning tutor

```ts
export const adr = {
  id: 1,
  title: 'Remember learner progress in a per-learner file, no long-term chat memory',
  status: 'accepted',
  layer: 'context',
  context:
    'Lessons last 20 turns and fit a 3 000-token budget. Learners return daily; what matters is which exercises they failed, not what they said. Learners are minors in some schools, so we keep as little personal data as possible and erase accounts within 14 days.',
  decision: 'We will send the full lesson conversation, keep a per-learner progress file of failed exercises, and store no chat transcripts after the lesson.',
  alternatives: [
    { option: 'Vector store of extracted chat memories', reason: 'Evals show progress data alone answers 95% of tutoring needs, and transcripts of minors add risk for no gain.' },
    { option: 'Window plus summary', reason: 'Lessons never exceed 20 turns, so the whole conversation fits the 3 000-token budget.' },
  ],
  consequences: {
    positive: ['Almost no personal data to secure, expire or erase.'],
    negative: ['The tutor cannot recall anything a learner said in an earlier lesson.'],
  },
};
```

The tutor needs far less memory than the briefing you will work on, and the ADR says so: each choice points back to a fact in its context.

## Pitfalls

- Choosing the store before naming the question kinds and measuring them.
- A budget that forgets the retrieved memories, or a conversation share too small for the latest turns.
- Isolation by account when several people share an account.
- Retention for memories but not for the summaries and facts derived from them.
- Only positive consequences.

Memory products and provider memory tools change quickly, and privacy rules around stored conversations are under active scrutiny by regulators. Record product versions and the legal basis for retention in the ADR, and review it when either changes.

## When to choose it

Write a memory ADR when a feature first keeps anything beyond one call, when it starts storing data across sessions, when the question mix changes (time-dependent questions appear), and when privacy commitments change. Supersede the record rather than editing it, so the history of what the product remembered, and why, stays readable.
