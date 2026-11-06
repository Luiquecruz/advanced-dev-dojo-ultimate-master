# Map: Memory

A model forgets everything between calls. Every feature so far worked around that by sending what the model needed on each call. This module answers the next question: **what should an AI feature remember across turns and sessions, and how does it store, retrieve, update and forget it safely?** Memory makes assistants feel personal and agents able to continue work, and it is also where stale facts, poisoned instructions and personal data pile up if nobody designed it.

## The question and the layer

This module belongs to **layer 2, context**: memory is one more source of what the model sees on each call, next to prompts (module 02), retrieved documents (module 04) and knowledge graphs (module 05). It also reaches into **layer 6, governance**, because stored memories are data with owners, retention rules and deletion duties.

| You decide | Options | The lesson |
| --- | --- | --- |
| Which kinds of memory the feature needs | working, episodic, semantic, procedural | 02 |
| What a long chat sends on each call | full history, sliding window, running summary, both | 03 |
| What is kept across sessions and how it is found | write policy, deduplication, relevance + recency + importance | 04 |
| How changing facts are stored | flat statements or a temporal graph with validity time | 05 |
| Who may read, write and delete | per-user isolation, provenance, retention, erasure | 06 |
| The whole design for one product | the memory ADR | 07 |

## Prerequisites

- **Module 01:** models are stateless; tokens, the context window and cost per call.
- **Module 02:** context engineering under a token budget, structured outputs you validate.
- **Module 04:** embeddings, cosine similarity and top-k retrieval; long-term memory reuses them.
- **Module 05:** facts as `subject → predicate → object` edges; the temporal graph adds time to them.

## The path

1. **Memory types** (quiz). The CoALA vocabulary: the context window as working memory, and episodic, semantic and procedural memory outside it; hot path versus background writes.
2. **Conversation memory.** You keep long chats within a token budget with a sliding window plus a running summary written by the model, and make sure a failed summary never loses history.
3. **Long-term memory.** You extract candidate memories with the model, filter them with a write policy, merge near-duplicates by similarity, and retrieve by weighted relevance, recency and importance.
4. **Temporal graph memory.** You store facts with valid time and transaction time, invalidate contradicted facts instead of deleting them, and answer "what was true then, as we knew it then".
5. **Memory poisoning and privacy.** You isolate memories per user, attach provenance, refuse instructions from untrusted sources, expire memories and erase a user completely, derived summaries included.
6. **The memory ADR.** You write the memory design for a briefing: types kept, conversation budget, long-term store and retrieval, isolation, retention and erasure.

## The thread through the module

Each lesson fixes a failure of naive memory. Resending everything gets slow and expensive (03). Storing everything buries the facts that matter under copies and trivia (04). Overwriting or piling up facts gives stale answers when the world changes (05). Storing without provenance, owners and expiry turns memory into an attack surface and a privacy liability (06). The ADR collects those answers for one product.

Memory layers, user-visible assistant memory and client-side memory tools all implement the layers in this module. Graph memory and self-editing memory are still `emerging`, and published comparisons often find simple memories (files, a vector store) competitive, so measure on your own questions.

## When to choose it

Take this module when your feature talks to the same users more than once or runs long tasks that must continue later. Start from the simplest memory that answers your users' real questions and measure it; add summaries, long-term stores or a temporal graph only when the measurements show what is missing. If every session is independent, skip long-term memory entirely: the safest data is the data you never stored.
