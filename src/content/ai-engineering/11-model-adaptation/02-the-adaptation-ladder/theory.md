# The Adaptation Ladder

When a model fails at a task, there are five broad ways to fix it, ordered from cheapest to most expensive. Together they form the **adaptation ladder**:

1. **Prompt.** Clearer instructions, constraints, an output format, a schema (Prompt Anatomy, Structured Outputs).
2. **Retrieval.** Put the missing knowledge in the context at request time (module 04).
3. **Examples and tools.** Show solved cases selected by similarity (Choosing Examples), and give the model tools for what it should not do in its head: arithmetic, lookups, code execution (module 03).
4. **Fine-tuning.** Change the weights with your own examples (lessons 03 and 04).
5. **Training.** Pretrain a model, or continue pretraining one on a large domain corpus.

Rungs 1 to 3 change **what the model sees**: the context layer. They are versioned like code, deploy in minutes, roll back instantly and survive a model swap. Rungs 4 and 5 change **what the model is**: they create a new artifact that needs data, compute, an eval gate, hosting and a retraining plan every time the base model moves.

## Climb only on evidence

The rule is simple: **climb a rung only when evals show the rung below fails on cases that matter**, and only if the next rung addresses the cause of that failure. That needs a frozen eval set with targets (module 10), run against every rung you try. Without it, "fine-tuning helped" means "someone read ten answers and liked them".

Rungs 1 to 3 are not strictly ordered among themselves. Pick the one that matches the failure:

| The failure | The usual fix | Rung |
| --- | --- | --- |
| Ignores instructions, wrong format | sharper instructions, schema, structured outputs | prompt |
| Does not know the facts, or the facts change | retrieval with citations | retrieval |
| Knows the facts but applies them inconsistently | similar solved examples | examples |
| Wrong arithmetic, stale lookups, needs actions | tools | tools |
| Format, tone or a narrow skill still fails after all of the above, at high volume | supervised fine-tuning | fine-tuning |
| Needs a behavior judged by preference or by a checker (style, refusals, verified math) | preference or RL tuning | fine-tuning |
| A new language or a domain with almost no public text | continued pretraining | training |

## What fine-tuning is good at, and what it is not

Fine-tuning excels at **behavior**: a consistent output format, a house style, a narrow classification or extraction task, shorter prompts (the instructions move into the weights), and letting a **small model** match a large one on one task, which is often the real business case.

Fine-tuning is poor at **knowledge**. Facts learned through fine-tuning are hard to update, impossible to cite, and studies show models learn new facts slowly through fine-tuning and hallucinate more as they do (Gekhman et al., 2024); retrieval consistently beat fine-tuning for injecting new knowledge in comparisons such as Ovadia et al. (2023). Knowledge that changes weekly belongs in retrieval, not in weights. The two combine well: fine-tune for the format and the skill, retrieve the facts.

## The hidden costs of climbing

- **Data.** Hundreds to thousands of clean, representative, labeled examples, free of personal data you are not allowed to train on, and never overlapping the eval set.
- **Compute and time.** Training runs, hyperparameter tries, evaluation of each candidate.
- **Hosting.** A fine-tuned open model must be served (lesson 07); a provider-hosted fine-tune often costs more per token than the base model and ties you to that provider.
- **Maintenance.** When the base model gets a better version, the fine-tune does not follow. You re-run the pipeline, re-evaluate and redeploy, or you fall behind.
- **Governance.** A new model artifact with its own lineage, license obligations and, in some jurisdictions, regulatory duties.

A prompt change costs minutes and is undone with a revert. Weigh every rung against that.

## A worked decision

A support team classifies tickets into 40 internal categories. Measured on a 400-ticket eval set (target 90%):

| Setup | Accuracy | p95 latency | Cost per 1 000 |
| --- | --- | --- | --- |
| Mid-tier API model, zero-shot | 78% | 900 ms | $1.10 |
| + category definitions in the prompt | 83% | 1 100 ms | $1.60 |
| + 10 similar labeled tickets as examples | 88% | 1 300 ms | $2.40 |
| Small open model fine-tuned on 5 000 tickets | 93% | 250 ms | $0.20 (self-hosted, plus fixed GPU cost) |

Examples came close but missed the target and made each call longer and pricier. Fine-tuning reached it, cut latency, and at this volume the GPU pays for itself. Category names that change monthly stay in the prompt, so a rename needs no retraining. That is a defensible climb: each rung measured, the failure stated, changing knowledge kept out of the weights.

> **Status as of October 2026:** several API providers offer hosted supervised fine-tuning (and some offer preference or reinforcement fine-tuning) for selected models, usually smaller tiers, with the tuned model served only on their platform. Open-weight models are fine-tuned with open libraries (Hugging Face TRL, PEFT, Unsloth, Axolotl) on rented GPUs. Long context windows and prompt caching have made the context rungs cheaper, raising the bar for fine-tuning.

## When to choose it

Use the ladder every time someone proposes adapting a model. Start at the prompt, add retrieval when knowledge is missing and examples when application is inconsistent, and measure each step on the same eval set. Fine-tune when a stable, narrow task still misses its target, when volume makes long prompts expensive, or when a small self-hosted model must do a large model's job. Train only when no existing model has seen your domain or language, which most product teams never face.
