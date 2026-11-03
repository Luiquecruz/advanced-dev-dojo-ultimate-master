# Conversation Memory

A model is stateless: a chat "remembers" earlier turns only because your code sends them again on every call. That works for ten turns. At two hundred turns the full history costs more on every call than the answer is worth, gets slower, eventually breaks the context window, and degrades quality long before that (*context rot*: the model uses a long, noisy context less well). **Conversation memory** is the policy that decides which part of the conversation each call sees.

## Four strategies

| Strategy | What each call sees | Buys | Costs |
| --- | --- | --- | --- |
| Full buffer | every message | perfect recall, no extra calls | cost and latency grow with every turn; the window eventually overflows |
| Sliding window | system prompt + the last N messages (or the last N tokens) | flat cost, simple | forgets everything older, including the booking number from turn 3 |
| Running summary | system prompt + a summary of everything so far | flat cost, keeps the gist | lossy, one extra model call per update, summary drift |
| Window + summary | system prompt + summary of the old part + the recent messages verbatim | the recent detail and the old gist | the most moving parts |

The hybrid is the default for long chats: recent turns carry the exact wording the next answer depends on ("change it to 10:30" needs the previous message), while the summary carries names, numbers and decisions from long ago. Retrieving old messages by similarity belongs to long-term memory (next lesson).

## Budget in tokens, not messages

Messages vary from three words to a pasted log file, so a window of "the last 20 messages" can be 200 tokens or 20 000. Measure the window with a token counter and fill it from the newest message backwards:

```ts
let start = history.length - keepRecent;
while (start > 0 && countTokens([...head, ...history.slice(start - 1)]) <= maxTokens) {
  start--;
}
```

`head` holds what is always sent: the system prompt and the summary. Two rules keep the window usable:

- **The system prompt is never trimmed.** It carries the instructions and the safety rules; a window that drops it changes the product's behavior silently.
- **The latest turns are always kept**, even if they alone exceed the budget. Answering without the user's last message is worse than a slightly expensive call.

Count everything that is sent: the summary and the system prompt use tokens too. A local estimate can undercount the provider's tokenizer, so leave headroom below the real window, as in module 01.

## Folding the overflow into a summary

Everything older than the window is the **overflow**. Instead of throwing it away, ask the model to merge it into the running summary:

1. Send the previous summary and the overflow messages in one request with a summarizer prompt and a `maxTokens` cap.
2. Accept the result only if it is a complete, non-empty answer (`finishReason: 'stop'`).
3. Replace the summary and drop the folded messages from the stored history.

Step 3 happens only after step 2 succeeds. The summary call can hit a rate limit, refuse (a transcript about a medical issue may trigger a filter), or be cut off by `maxTokens`. A truncated summary is worse than none, because it looks valid. If the update fails, keep the stored history untouched and try again on the next turn; the window still trims what is *sent*, so the conversation continues within budget meanwhile. Losing user history because a summarizer hiccuped is a data-loss bug.

Fold incrementally: each message is summarized exactly once, then lives on only inside the summary. Re-summarizing the whole history every turn costs more and makes the summary drift as it is rewritten again and again.

## Writing a good summarizer prompt

- Ask to **merge**, not to append: "update the summary with the new messages".
- Name what must survive: people, ids, numbers, dates, decisions, open questions, the user's stated preferences.
- Ask for plain statements, no preamble, so the summary is cheap to resend.
- Treat the summary as untrusted text derived from the conversation: if a user pasted an instruction, it can survive into the summary and be resent as if it were part of the system context. Lesson 06 returns to this.

When to compact is a separate decision: every turn (as in the challenge), past a threshold such as 80% of the budget, or in the background after the reply is sent.

## Pitfalls

- Trimming by message count instead of tokens.
- A window that drops the system prompt or the user's latest message.
- Dropping history before the summary succeeded, or accepting a truncated or refused summary.
- Re-summarizing the full history every turn.
- Forgetting that the summary itself counts against the budget and grows.

> **Status as of October 2026:** several providers offer server-side conversation state and automatic compaction of long contexts (for example Anthropic's compaction and context editing), and agent frameworks such as LangGraph ship message trimming and summarization helpers. They implement the same window-plus-summary idea; you still choose the budget, what must never be trimmed and what happens when compaction fails.

## When to choose it

Use a plain full buffer while conversations stay short and cheap; measure the token count per call before adding machinery. Add a token-based sliding window as soon as conversations can grow without bound. Add the running summary when users refer back to early details (bookings, ids, decisions) that a window would forget. Move to retrieval over past messages or long-term memory when users come back across sessions, or when what matters is a few specific facts rather than the gist of the whole conversation.
