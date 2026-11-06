# Shared State

Orchestrators pass results up and handoffs pass the conversation along. A third way for agents to cooperate is to **write to shared state** that others read: a plan, findings per topic, a draft, a task list. The classic name is a **blackboard**, from 1970s AI systems where independent "knowledge sources" posted partial solutions to a common board and a controller decided who acts next. Agent teams in coding tools follow the same shape today: a shared task list that teammates claim and update, plus messages between them.

Shared state solves real problems: agents do not need to know about each other, late joiners see the full picture, and a long investigation survives restarts because its state lives outside any context window. It also brings back every problem of concurrent programming, with participants that are slow, non-deterministic and confident.

## The lost update

Two editor agents read the draft at version 1. Each spends twenty seconds calling a model. The first writes its version; the second writes its own a moment later, built on version 1, and the first editor's work disappears without an error. Nothing crashed; the result is just wrong. Model latency makes this window huge compared with ordinary code.

## Three rules that make a blackboard safe

**1. Ownership per key.** Each key (or key pattern) has one owner role: the lead owns `plan`, researchers own `findings:*`, the analyst owns `findings:pricing`, editors own `draft`. A write from anyone else is rejected. Ownership turns "who changed the plan?" into a question with one answer, and it is a permission boundary: a researcher that read a poisoned web page cannot rewrite the plan. Resolve patterns predictably: the exact key first, then the longest matching prefix.

**2. Optimistic versioning (compare-and-set).** Every key carries a version. A writer sends the version it read; the board accepts the write only if that is still the current version, and increments it. Otherwise the write is rejected as a **conflict** and the writer must re-read and redo its work on the fresh value. No locks are held during the slow model call; conflicts are detected at the end. This is the same optimistic offline lock web applications use with ETags and `If-Match`.

```ts
const current = board.read('draft');                     // { value, version: 4 }
const reply = await model.generate(promptWith(current.value));
const result = board.write('editor', 'draft', reply.text, current.version);
if (!result.ok && result.reason === 'version_conflict') { /* re-read and try again */ }
```

Ownership failures are not retried: retrying cannot make you the owner. Conflicts are retried a bounded number of times; a key that conflicts constantly has too many writers and needs a different split.

**3. An append-only log.** Record every write attempt (agent, key, value, the version expected, accepted or rejected and why) with a sequence number, and never modify it. The current state is then just a **replay** of the accepted entries in order, which gives you an audit trail ("which agent wrote the number that ended up in the report?"), debugging across agents, and recovery after a crash. Hand out copies, not references: an agent that mutates an object it read must not change the board behind everyone's back.

## Conflict rules beyond compare-and-set

Compare-and-set detects conflicts; it does not decide who is right. Other policies exist, and the choice is per key:

| Policy | Fits | Risk |
| --- | --- | --- |
| Reject stale writes (compare-and-set) | drafts, plans, anything built on what was read | retries cost model calls |
| Last writer wins | caches, heartbeats, progress counters | silent lost updates |
| Append only (one entry per writer) | findings, votes, logs | readers must merge |
| Owner decides (merge by a coordinator) | contradictory findings | the coordinator is a bottleneck |

Keys that collect independent contributions (each researcher's findings) are best made append-only or split into one key per writer, so they never conflict at all.

Some products coordinate agents through a shared task list whose claims use file locking, and a mailbox per agent. Graph frameworks keep a shared state with reducers that decide how concurrent updates merge, plus checkpoints. Several frameworks expose a shared "memory" or "context" object between agents; check whether it versions writes before trusting it with concurrent agents.

## When to choose it

Use a blackboard when many agents contribute pieces to one evolving artifact over time, when contributors come and go, or when the state must outlive any single agent. Give every key an owner, version every write, log everything, and prefer keys that only one writer touches. If agents only need to return a result to a coordinator, plain return values (orchestrator-workers) are simpler; if they need to pass a conversation, use handoffs.
