# AI Feature UX

The engineering of the earlier modules decides whether an AI feature is correct, safe and affordable. Its interface decides whether people can **use** it well: wait for it, judge it, correct it and recover when it fails. A model that is right 90% of the time behind a UI that hides the other 10% does more damage than a weaker model behind an honest one.

## Latency: budgets and streaming

Model calls are slow by web standards: seconds for a long answer, tens of seconds or minutes for an agent. The classic response-time limits (Jakob Nielsen, 1993) still frame expectations: about 0.1 s feels instant, about 1 s keeps the flow of thought, and beyond about 10 s people lose focus and need progress feedback.

- **Set a latency budget per feature** and design to it: an inline suggestion needs to appear in well under a second, a report can take a minute if the user knows it is coming.
- **Stream** text as it is generated (`model.stream` in module 01). The metric users feel is **time to first token**, not total time.
- **Show progress for agents**: which step is running ("searching the help center", "reading invoice INV-1001"), not a spinner for 40 seconds.
- **Let people stop** a generation, and keep partial output useful.
- Streaming has costs: you cannot validate a structured output until it is complete, and a stream can fail midway. Buffer what must be validated, and handle the interrupted stream (respond.failMidStream in the fake model) with a retry or a clear message.

## Showing uncertainty and sources

Models sound equally confident when they are right and when they are wrong. The interface has to supply the calibration the text lacks:

- **Show sources** for grounded answers, linked to the exact passage (Grounded Answers and Citations, module 04). Sources turn "trust me" into "check me".
- **Say when the system does not know.** "No document covers refunds for annual plans in Brazil" is a better answer than a fluent guess; design the empty state.
- **Communicate uncertainty in terms users can act on**: "based on 2 of 14 documents", "needs review", or a confidence label backed by measured accuracy. Raw probabilities or invented percentages mislead.
- **Label AI-generated content** where people could mistake it for human or authoritative content; transparency duties in regulation increasingly require it (Governance in Layers, module 13).

## Editable outputs and human control

Treat model output as a **draft**. A reply suggestion the agent can edit before sending, a generated query shown before it runs, a refund prepared but awaiting approval: each keeps the human as the decision maker and turns model errors into quick edits instead of incidents. For actions with side effects, show exactly what will happen and ask for confirmation; the permission policies of module 08 are the backend of this UI.

## Feedback capture

Every AI feature is an experiment running in production. Capture:

- **Explicit feedback:** thumbs up or down, with an optional reason ("wrong", "outdated", "unsafe"), tied to the trace id.
- **Implicit feedback:** the user edited the draft heavily, copied the answer, retried, or escalated to a human.

Route both into your eval and review pipeline (Production Feedback and Drift, module 10). Feedback that nobody reads is decoration.

## Fallbacks and graceful degradation

Models time out, rate-limit, refuse and return malformed output. Plan the user-facing behavior for each:

- a cached or simpler answer (a cheaper model, a search result list) when the primary path fails;
- the non-AI path kept available: a form, a search box, a link to documentation;
- a **human handoff** with context: when the assistant cannot help or the user asks for a person, pass the conversation and what was tried, so the user does not start over;
- honest error messages instead of an empty box or a generic apology.

Cost is part of UX too: a feature that costs more per use than it earns will be throttled or removed. Track cost per feature (module 01) next to latency and satisfaction.

> **Status as of October 2026:** provider APIs stream with server-sent events, and UI libraries such as the Vercel AI SDK ship streaming hooks and components for chat, tool progress and structured output. Google's People + AI Guidebook and Microsoft's Guidelines for Human-AI Interaction (18 guidelines, CHI 2019) remain the standard design references. Under the EU AI Act, transparency duties (Article 50: telling people they interact with an AI system, marking AI-generated content) apply from 2 August 2026, with a grace period until 2 December 2026 for the machine-readable marking of generative systems already on the market.

## When to choose it

Design the failure, uncertainty and handoff states before the happy path: they are where trust is won or lost. Stream when answers take more than a second, show sources whenever the answer comes from your data, make outputs editable whenever a human will act on them, and wire feedback into evals from the first release.
