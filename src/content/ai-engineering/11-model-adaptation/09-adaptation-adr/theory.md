# Checkpoint: the Adaptation ADR

This module looked inside the model layer: the adaptation ladder, fine-tuning with LoRA, preference and reinforcement tuning, synthetic data, the Hugging Face ecosystem, local inference with its memory math, and the model supply chain. The checkpoint turns them into one decision: an **Architecture Decision Record** for adapting (or not adapting) a model, plus an **adaptation plan** precise enough for a training engineer to execute and an auditor to check.

An adaptation ADR is never "we will fine-tune because it is better". It answers five questions, each with evidence: which rung, with what data, behind which eval gate, served how, and from which verifiable artifact.

## The decision checklist

1. **The rung.** Run the same frozen eval set against each rung you can try, cheapest first. Choose the lowest rung that meets every target, and name the best rung below it as the **baseline** the candidate must beat. If a context rung meets the targets, the ADR says "we will not fine-tune", which is a perfectly good decision.
2. **The method.** If the rung changes weights, choose a method that fits your training hardware and data: LoRA by default, QLoRA when memory is tight, full fine-tuning only with a strong reason and a large budget. Keep facts that change (prices, codes, policies) in the prompt, retrieval or tools, never in the weights.
3. **The data.** How many examples (the learning curve tells you when more stops helping), where they come from, how personal data is removed, how much synthetic data is allowed, and the rule that the eval set never enters training.
4. **The eval gate.** Thresholds at least as strict as the product targets, the baseline to beat, and the events that rerun the evals: new training data, a new base model revision, a quantization change, a runtime upgrade. Without rerun triggers, the gate guards one deploy and then nothing.
5. **Serving.** The runtime the platform can operate, the quantization that keeps quality above target, and the memory math (weights + KV cache for real concurrency + overhead) against the GPU you have.
6. **The artifact.** A base model whose license allows your use, from a verified publisher, at a pinned revision with file hashes, in safetensors, without remote code, recorded with its adapter in the AI-BOM.

| Option | Buys | Costs |
| --- | --- | --- |
| Stay on context rungs | fast iteration, instant rollback, model swaps for free | longer prompts, a quality ceiling on narrow tasks |
| Provider-hosted fine-tune | no GPUs to operate | data leaves your network, lock-in, often higher per-token price |
| Self-hosted LoRA fine-tune | quality on narrow tasks, short prompts, data control | a training pipeline, GPUs, retraining on every base change |
| Aggressive quantization | smaller GPUs, faster decoding | quality loss that must pass the eval gate |

## Writing the ADR well

- **Context** lists the forces with numbers: volume, targets, latency, privacy and hosting constraints, what changes often, and what the pilots measured on each rung.
- **Decision** is one "We will" sentence naming the rung, the base model and revision, the serving setup and the eval gate.
- **Alternatives** are the options someone will propose again: "just use the frontier API", "the model with the highest pilot score", "a bigger model", "4-bit to save money". Each is rejected by a fact: a contract, a license, a memory budget, an eval result.
- **Consequences** are honest. Fine-tuning means owning a pipeline, retraining on base model updates, securing and recording new artifacts.

## Example: deciding not to fine-tune

```ts
export const adr = {
  id: 4,
  title: 'Answer HR policy questions with retrieval instead of fine-tuning',
  status: 'accepted',
  layer: 'model',
  context:
    'Policies change monthly and answers must cite them. On a 200-question eval set, retrieval with a mid-tier API model reached 94% grounded accuracy against a 90% target; a LoRA pilot reached 91% and could not cite sources.',
  decision: 'We will keep the pinned API model with retrieval and not fine-tune, and revisit if accuracy on the eval set falls below 90%.',
  alternatives: [
    { option: 'LoRA fine-tune on policy Q&A', reason: 'Lower accuracy than retrieval, no citations, and monthly retraining as policies change.' },
  ],
  consequences: {
    positive: ['Policy updates ship by reindexing documents, with no training pipeline to own.'],
    negative: ['Each answer carries retrieved excerpts, so calls cost more tokens than a tuned model would.'],
  },
};
```

The lowest rung that met the target won, and the record says what would reopen the decision.

## Pitfalls

- Choosing the rung or the base model by the highest pilot score, ignoring license, provenance or memory.
- An eval gate without a baseline, or one that never reruns.
- Training on the eval set, or on unredacted personal data.
- Baking weekly facts into the weights.
- Memory estimates that forget the KV cache for real concurrency.
- A plan that pulls "the latest" revision of the base model.

> **Status as of October 2026:** LoRA on open-weight models served by vLLM or SGLang is a common self-hosted pattern, and FP8 serving is widely supported on recent data-center GPUs. Several API providers offer hosted fine-tuning on selected models. Under the EU AI Act, substantially modifying a general-purpose model can make you its provider for the modification; record the base model, data and compute in the ADR.

## When to choose it

Write an adaptation ADR whenever someone proposes fine-tuning, distillation or self-hosting an open model, and also when you decide not to: the record of why the context rungs were enough saves the next debate. Supersede it when the base model, the data, the targets or the hardware change, so the history of each model artifact, and the evidence behind it, stays readable.
