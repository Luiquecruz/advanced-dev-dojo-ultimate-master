# Grounded Answers and Citations

Retrieval finds passages; generation turns them into an answer. The answer is only as trustworthy as its link back to the passages. A RAG answer is **grounded** when every claim is supported by a source the system actually provided, and **cited** when the reader can check which one. Without both, RAG is a hallucination machine with extra steps.

## Sources in context

Give the model the passages in a form it can point at:

```
[1] (handbook/billing.md) Refunds reach the original card within 5 to 10 business days.

[2] (handbook/refunds.md) Annual plans can be refunded in full within 30 days of purchase.

Question: When will my annual plan refund reach my card?
```

- **Number** each passage. Short numbers are easier for a model to cite correctly than long ids or URLs, and you map them back to ids after the call.
- **Filter by evidence first.** Only passages above a relevance threshold enter the context; irrelevant passages invite the model to use them anyway.
- **Order and cap.** Put the strongest passages first and limit how many you send; long contexts dilute attention ("lost in the middle", context rot) and cost tokens.
- **Instruct**: answer only from the sources, cite a number after every claim, and say so when the sources do not answer.

## Validate, do not trust

Instructions raise the citation rate; they do not guarantee it. After the call, parse the citations and check them in code:

1. **Every cited number exists in the list you sent.** A citation of `[5]` when you sent three sources is invented, even if a document 5 exists somewhere in your corpus: it was not *provided* for this answer.
2. **There is at least one citation.** An uncited answer is ungrounded by definition.
3. **The reply finished normally.** A truncated or refused reply is not an answer.

When validation fails, give the model one chance to fix it: append its reply and a short correction ("you cited [5], which is not a provided source; use only [1], [2], [3]"). If the second attempt also fails, **withhold** the answer and show the sources or a fallback message. One repair keeps cost bounded; unbounded repair loops are a cost incident waiting to happen.

Stronger checks exist and belong to evaluation (module 10): **faithfulness** (does the cited passage support the sentence?) is usually measured with an LLM judge or an entailment model on samples, not on every request.

## Refusing without evidence

The cheapest correct answer is "I could not find this in the handbook." If no passage passes the threshold, **do not call the model**: there is nothing to ground an answer in, and asking anyway produces a fluent guess from the model's training data. This decision lives in code, before generation, and is easy to test.

| Situation | Behavior |
| --- | --- |
| No passage above the threshold | refuse without a model call |
| Answer with valid citations | show the answer with linked sources |
| Invented or missing citations | one repair attempt, then withhold |
| Model refuses or is cut off | treat as no answer |

## Showing citations

Map each cited number back to its passage and render it as a link to the source (with the offsets from chunking, lesson 02, you can highlight the exact passage). Users check citations rarely, but they trust answers more when they can, and support teams use them to find the documents that need fixing.

## Pitfalls

- Trusting citations because the prompt asked for them.
- Sending every retrieved passage, including irrelevant ones, "just in case".
- Calling the model when nothing relevant was retrieved.
- Repairing in an unbounded loop.
- Accepting a citation to a document that exists but was not in this context.

> **Status as of October 2026:** several model APIs offer built-in citation features that return structured references to provided documents, and evaluation libraries such as Ragas measure faithfulness and answer relevance. Built-in citations reduce parsing work but still need the same checks: provided, valid and present.

## When to choose it

Ground and cite whenever an answer states facts the user may act on: policies, prices, procedures, legal or medical information, anything from your documents. Refuse without evidence in every RAG feature; it is cheap and prevents the worst failures. Skip citations only for creative or conversational features where no factual source exists, and then do not call the feature RAG.
