# Fine-Tuning and LoRA

**Supervised fine-tuning (SFT)** continues training a pretrained model on examples of the behavior you want: input, expected output, thousands of times. The model's weights move a little toward producing your outputs for your inputs. This lesson covers what changes, what it costs, and what can go wrong, at the level you need to review a fine-tuning plan.

## The data is the program

A fine-tuning dataset is a list of conversations in the model's chat format:

```json
{ "messages": [
  { "role": "system", "content": "Extract the delivery exception as JSON." },
  { "role": "user", "content": "left at door, customer not home, gate code wrong" },
  { "role": "assistant", "content": "{\"type\":\"access_problem\",\"retry\":true}" }
] }
```

What the model learns is whatever these examples have in common, including their mistakes. A few hundred to a few thousand **clean, consistent, representative** examples usually beat a large noisy set; the LIMA paper (2023) tuned a strong assistant on about 1 000 carefully chosen examples. Hold out an eval set first and never train on it, remove personal data you may not train on, and cover the rare cases the product must handle, not only the frequent ones.

## Full fine-tuning vs parameter-efficient fine-tuning

**Full fine-tuning** updates every weight. It is the most expressive option and the most expensive. Training with the Adam optimizer in mixed precision needs roughly **16 bytes per parameter** before activations: the 16-bit weights (2), their gradients (2), a 32-bit master copy (4) and two optimizer states (8). For an 8-billion-parameter model that is about 128 GB, several data-center GPUs. The result is a full copy of the model per fine-tune.

**Parameter-efficient fine-tuning (PEFT)** freezes the base model and trains a small number of new parameters. The dominant method is **LoRA** (Low-Rank Adaptation, Hu et al., 2021). For a weight matrix `W`, LoRA learns a low-rank update `ΔW = B × A`, where `A` and `B` are thin matrices of rank `r` (often 8 to 64). Only `A` and `B` train:

- Trainable parameters drop to a fraction of a percent of the model. The paper reports 10 000 times fewer trainable parameters and 3 times less GPU memory than full fine-tuning of GPT-3 175B.
- The frozen base still has to sit in memory: about 2 bytes per parameter in 16-bit, so roughly 16 GB for an 8B model, plus activations and the small adapter with its optimizer state.
- The output is an **adapter** of a few megabytes to a few hundred megabytes. You can **merge** it into the base (no extra inference latency) or keep it separate and **swap adapters** per customer or task on one base model; servers such as vLLM can serve many LoRA adapters at once.

**QLoRA** (Dettmers et al., 2023) loads the frozen base in 4-bit (the NF4 data type), trains LoRA adapters in 16-bit on top, and adds memory tricks (double quantization, paged optimizers). The base drops to about half a byte per parameter: an 8B model's base takes about 4 to 5 GB, and the paper fine-tuned a 65B model on a single 48 GB GPU. The cost is slower training and a small quality gap that is often negligible.

| Method | Memory for an 8B model (approx.) | Output | Typical use |
| --- | --- | --- | --- |
| Full fine-tuning | ~128 GB + activations | a full model copy | large budgets, deep behavior change |
| LoRA | ~16 GB base + activations | a small adapter | the default for product teams |
| QLoRA | ~5 GB base + activations | a small adapter | one consumer or mid-range GPU |

## What can go wrong

- **Catastrophic forgetting.** Training hard on a narrow task degrades what the model knew before: general reasoning, other languages, safety behavior. LoRA forgets less than full fine-tuning, but also learns less ("LoRA Learns Less and Forgets Less", Biderman et al., 2024). Evaluate the fine-tune on your task **and** on a sample of general and safety cases.
- **Overfitting.** Too many epochs or too little data and the model memorizes the training set: excellent training loss, worse eval scores. Watch the eval score, not the loss.
- **Memorizing private data.** A model can reproduce training examples verbatim. Anything in the dataset may come out of the model.
- **Learning the wrong thing.** If 80% of examples have one label, the model learns to say that label. Balance and deduplicate.
- **Knowledge that does not stick.** Facts injected by fine-tuning are learned slowly and unreliably and cannot be cited (lesson 02). Retrieval remains the tool for knowledge.

## When prompts or RAG are enough

Before fine-tuning, check three things. If the failure is missing or changing knowledge, use retrieval. If it is format, try structured outputs and schema validation first. If it is inconsistent application, try well-chosen examples. Fine-tune when those are measured and still miss the target, or when the volume makes a long prompt with many examples more expensive than a short call to a tuned model.

LoRA and QLoRA are the usual starting point for open-weight fine-tuning, implemented in open libraries such as Hugging Face PEFT. Variants exist, but plain LoRA is the baseline to beat. Hosted SFT, where a provider offers it, does not expose the method or the weights.

## When to choose it

Choose LoRA for almost every product fine-tune: it fits on one GPU, produces small swappable adapters, and forgets less. Choose QLoRA when GPU memory is the constraint. Consider full fine-tuning only with a large budget, a large dataset and a behavior change LoRA measurably cannot reach. In every case, the fine-tune ships only if it beats the best context-layer setup on a frozen eval set without regressing general and safety checks.
