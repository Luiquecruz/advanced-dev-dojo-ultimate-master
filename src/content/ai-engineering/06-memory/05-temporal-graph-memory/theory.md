# Temporal Graph Memory

Flat memories break when facts change. The user said "I work at Acme" in January and "I started at Globex" in March. A vector store now holds both statements with similar embeddings, and "Where do I work?" may retrieve the stale one, or both, leaving the model to guess. Deduplication by similarity cannot help: the two facts are different, and one replaced the other. **Temporal graph memory** stores facts as relations between entities and records *when* each one was true, so a change becomes an explicit event instead of a contradiction hidden in a pile of text.

## Facts as edges with time

A graph memory stores `subject → predicate → object` triples, such as `ana → works_at → Acme`, extracted from conversations (module 05 showed how to extract and validate them). Entities give you multi-hop questions ("who works with Ana's manager?"); time gives you correctness when the world changes.

The key idea comes from **bi-temporal** databases: every fact carries two independent timelines.

| Timeline | Fields | Question it answers |
| --- | --- | --- |
| **Valid time** | `validFrom`, `validTo` | When was this true in the world? |
| **Transaction time** | `recordedAt`, `expiredAt` | When did the memory believe it? |

They differ all the time. Ana started at Globex on March 1 (valid time) but mentioned it on March 10 (transaction time). Between those dates, the memory honestly believed she still worked at Acme. Keeping both timelines lets you answer two different questions: "Where did Ana work on February 15?" and "What did the assistant believe on March 5, when it sent that email to her Acme address?" The second is the audit question, and it is impossible to answer if you overwrite rows.

The Zep paper describes exactly this model for agent memory: a timeline of events and a transactional timeline of ingestion, with valid/invalid and created/expired timestamps on each edge. Graphiti, its open-source engine, stores facts as edges with `valid_at`, `invalid_at`, `created_at` and `expired_at`.

## Invalidate, never overwrite

When a new fact contradicts a believed one, the memory **invalidates** the old fact instead of deleting it:

1. The old record stops being believed: its `expiredAt` becomes now.
2. A corrected copy is recorded: same fact, but its `validTo` is the new fact's `validFrom` (Acme was true from January 1 *until* March 1).
3. The new fact is recorded, valid from March 1 and still open.

```ts
graph.add({ subject: 'ana', predicate: 'works_at', object: 'Globex', validFrom: march1 });
graph.asOf('ana', 'works_at', february15);
graph.asOf('ana', 'works_at', march5, march5);
```

The first query returns Acme (true then, by today's knowledge); the second returns the open Acme record (what was believed on March 5). Records are only ever added or expired, so past answers never change: an append-only log of beliefs.

Not every predicate conflicts. A person works at one employer at a time (in this model) and lives in one city, but can like jazz and cycling at once. Declare which predicates are **exclusive** (single-valued per subject); only those trigger invalidation. Production systems such as Graphiti ask a model whether a new edge contradicts semantically related existing edges; an exclusive-predicate rule is the deterministic version you can test. Two more cases need explicit rules:

- **Restating** a believed fact ("Ana works at Globex", again) changes nothing.
- **Late knowledge about the past** ("before Porto, Ana lived in Lisbon") must not overwrite newer facts: the old fact ends where the newer one starts. Graphiti similarly prioritizes new information but uses valid times to order facts.

## Querying in time

- **Current:** believed facts whose validity is still open. This is what most prompts need.
- **As of valid time *T*:** facts with `validFrom ≤ T < validTo` (an open `validTo` counts as infinity), among those believed now.
- **As of valid time *T*, known at *K*:** the same, among records believed at *K* (`recordedAt ≤ K < expiredAt`).

Half-open intervals (start inclusive, end exclusive) make adjacent facts meet without overlapping: on March 1, Ana works at Globex, not at both.

## Compared with flat memory

| Question | Flat vector memory | Temporal graph |
| --- | --- | --- |
| "What does Ana like?" | good | good |
| "Where does Ana work now?" | may return the stale fact | correct |
| "Where did Ana work in February?" | no notion of time | correct |
| "What did we believe when we emailed her?" | impossible | correct |
| Cost | embed and store | extraction to triples, entity resolution, contradiction checks |

The upgrade is not free: every write needs reliable extraction into a schema, entity resolution ("Ana", "Ana Souza" and "she" are one node), and a contradiction check. Errors there corrupt the graph in ways a flat store would not.

> **Status as of October 2026:** Graphiti (open source, by Zep) and Zep's hosted service are the best-known temporal knowledge graph memories for agents; Zep's paper (January 2025) reports gains over flat memory on temporal reasoning questions. Bi-temporal tables are an old database idea, standardized in SQL:2011 (application-time and system-versioned tables). Published comparisons also show simple memories staying competitive on many benchmarks, so measure on your own questions.

## When to choose it

Choose a temporal graph when facts about your users or domain change and questions depend on when ("what plan was the customer on when the invoice was issued?"), when you need to audit what the system believed at a past moment, or when answers need relations between entities. Stay with a flat store when memories are mostly independent preferences and notes, or when nobody asks time-dependent questions; measure first, upgrade when the eval shows stale or contradictory answers.
