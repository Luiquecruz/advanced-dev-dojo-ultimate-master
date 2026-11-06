# Context Engineering

Prompt engineering asks "how do I phrase the instruction?". **Context engineering** asks the larger question: what exactly should the model see on this call? On every request the context is assembled from many sources: the system prompt, examples, conversation history, retrieved documents, memory, tool definitions and tool results. The model knows nothing else. Deciding what goes in, in what form, in what order, and what stays out is where much of an AI feature's quality, cost and latency is decided.

## More context is not free

Context windows have grown to hundreds of thousands of tokens and more, which tempts teams to send everything "just in case". Three costs push back:

- **Money and time.** Every input token is paid for on every call and lengthens the prefill before the first output token.
- **Hard limits.** History and tool results grow during a session until a request fails with a context-length error, usually in the longest, most valuable conversations.
- **Context rot.** Model quality degrades as input grows, even on simple tasks and well within the advertised window. Irrelevant or near-relevant material (distractors) hurts more than length alone, and information in the middle of a long context is used less reliably than at the start or the end ("lost in the middle").

Treat context as a **budget**: a finite resource with diminishing returns, where each token should earn its place.

## Four strategies

| Strategy | What it means | Examples |
| --- | --- | --- |
| **Write** | Save information outside the context window for later | scratchpads, notes files, memory stores (module 06) |
| **Select** | Pull in only what is relevant to this call | retrieval (module 04), example selection (lesson 04), relevant tools only (module 03) |
| **Compress** | Keep the substance in fewer tokens | trimming documents, summarizing old turns, clearing stale tool results |
| **Isolate** | Split work across separate contexts | sub-agents with their own windows (module 09), sandboxed tool output |

This lesson's builder applies **select**, **compress** and the budget discipline that ties them together; later modules build the rest.

## A context builder

Assembling context in one function, under an explicit token budget, makes the decisions visible and testable:

1. **Reserve** room for the output: the budget for input is the context window minus `maxTokens` (and in practice a safety margin, lesson 01-04).
2. **Pin** what is never dropped: the system prompt and the latest user message. If they alone do not fit, fail loudly; silently cutting the question produces confident nonsense.
3. **Select**: discard documents below a relevance floor.
4. **Compress**: trim long documents to their leading sentences (or summarize them with a cheaper model) before they compete for space.
5. **Fill by priority**: add candidates in order of value while they fit. For grounded question answering, evidence usually outranks old chit-chat; a companion chat app might rank recent history first. The priority order is a product decision; write it down.
6. **Order deliberately**: system prompt first, history in chronological order, documents with the most relevant nearest the question, and the question last.
7. **Report** what was included, compressed and dropped. When an answer is wrong, "the refund policy was dropped for budget" is the first thing you want to know.

```ts
const context = buildContext({ system, history, question, documents, budget: model.contextWindow - maxOutputTokens, minScore: 0.2 });
await model.generate({ messages: context.messages, maxTokens: maxOutputTokens });
log({ included: context.includedDocumentIds, dropped: context.droppedDocumentIds, tokens: context.tokens });
```

Two details matter. History is dropped **oldest first** and in whole turns: a lone assistant reply without its question confuses the model. And the kept history should stay **contiguous**: skipping a large middle turn to keep an older small one creates a conversation that never happened.

## Agents make it harder

In an agent loop (module 07) context grows with every tool call: file contents, search results, command output. Long-running agents rely on the same tools at a larger scale: clearing old tool results, **compaction** (summarizing the conversation into a fresh context when it nears the limit), structured notes the agent writes and re-reads, and sub-agents that explore in their own context and return only a summary.

## Pitfalls

- Context stuffing: whole documents and full histories on every call.
- Budgets that ignore the output reserve, so long conversations fail with a context-length error.
- Truncating the question or the system prompt to make room.
- Dropping half a turn, or leaving gaps in history.
- No record of what the model actually saw, which makes wrong answers impossible to debug.
- Assuming a bigger window removes the need to select: context rot says otherwise.

Context windows are large but not uniform in quality: measurements show reliability degrading as input grows, and agent harnesses respond with automatic compaction and tool-result clearing. Check your model's documented window and measure degradation on your own tasks.

## When to choose it

Put an explicit context builder with a token budget in front of every call that combines more than a fixed prompt and one input: chat with history, retrieval, memory or tool results. Prefer selection over a bigger window, and measure with evals whether each source actually improves answers before giving it budget. A single fixed prompt with a short input needs none of this; a long-running agent needs all of it, plus the compaction and isolation strategies of later modules.
