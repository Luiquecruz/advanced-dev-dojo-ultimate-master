# Map: Model Adaptation and Open Models

Every module so far changed what surrounds the model: the prompt, the retrieved context, the tools, the loop, the evals. The weights stayed the same, rented from a provider or downloaded as a file. This module answers the last question of the model layer: **when should you change the model itself, and when should you run it yourself?** It also covers what happens once you do: where open models come from, how they are licensed, how they fit on your hardware and how they can be attacked before they ever answer a prompt.

## The question and the layer

This module belongs to **layer 1, the model**: which model, where it runs and how it is adapted. Module 01 chose models from the outside, as a buyer. This module looks inside: what fine-tuning changes in the weights, what preference tuning adds, how much memory a model needs, and which artifacts you inherit when you download one. It ends where governance begins: a model you adapt or host is a model you are responsible for.

| You decide | Options | The lesson |
| --- | --- | --- |
| Whether to adapt the model at all | prompt, retrieval, examples and tools, fine-tuning, training | 02 |
| How to change the weights | full fine-tuning, LoRA, QLoRA, adapters | 03 |
| How to teach preferences and skills | RLHF, DPO, GRPO, verifiable rewards, distillation | 04 |
| Where training data comes from | labeled production data, synthetic data, filters | 05 |
| Where open models and tools come from | the Hugging Face Hub, cards, libraries, licenses | 06 |
| Where and how the model runs | Ollama, llama.cpp, vLLM, SGLang, quantization, memory math | 07 |
| Whether the artifact is safe to load | safetensors vs pickle, provenance, signing, AI-BOM | 08 |

## Concepts only, for now

Every lesson in this module is a concept lesson with a quiz, and the module ends with an ADR. There is no hands-on fine-tuning or local inference yet: training even a tiny model needs real compute, model downloads and a Python environment, which a browser-only platform does not have. **Hands-on adaptation is planned for a later version of this track**, once that architecture decision is made. Until then, the goal is the engineer's half of the job: knowing when adaptation pays off, estimating what it costs, and reviewing a plan someone else will execute.

## Prerequisites

- **Module 01:** model families, open weights vs open source, tokens and cost, benchmarks and their limits.
- **Module 02:** prompts, structured outputs and choosing examples: the cheapest rungs of the ladder.
- **Module 04:** retrieval and RAG: the usual answer when the model lacks knowledge.
- **Module 10:** evals as tests and regression gates. Every decision in this module is gated by an eval; without one, "fine-tuning helped" is an opinion.

## The path

1. **The adaptation ladder** (quiz). Prompt, retrieval, examples and tools, fine-tuning, training: what each rung fixes and why you climb only when evals say the rung below failed.
2. **Fine-tuning and LoRA** (quiz). Supervised fine-tuning, full vs parameter-efficient, the memory math, catastrophic forgetting, and what fine-tuning cannot teach.
3. **Preference and reinforcement tuning** (quiz). RLHF, DPO, GRPO, reinforcement learning with verifiable rewards and distillation, at the level an engineer needs to read a model card.
4. **Synthetic data** (quiz). Generating, filtering and mixing model-written training data, and the risks: model collapse, bias amplification, eval contamination.
5. **The Hugging Face ecosystem** (quiz). The Hub, model and dataset cards, the libraries, and how to read a license.
6. **Local inference and quantization** (quiz). Runtimes for laptops and servers, GGUF and quantization levels, and the memory math with a worked example.
7. **The model supply chain** (quiz). Code execution on load, safetensors, provenance, signing and the AI bill of materials.
8. **The adaptation ADR.** You decide which rung a product needs, what data it takes, the eval gate, the serving setup and the supply-chain checks, and tests check the plan against a briefing.

## The thread through the module

The default answer is "do not adapt". Prompts, retrieval and examples are cheaper, faster to change and easier to roll back than weights. Each lesson gives you a reason to climb (a measured failure the lower rungs cannot fix) and a cost of climbing (data, compute, hosting, a new artifact to secure and govern). The ADR asks you to show both.

Hosted fine-tuning is offered by some API providers for some of their models, while open-weight models are fine-tuned with open libraries such as Hugging Face TRL and PEFT and served with local or self-hosted runtimes; check what your provider and runtime currently support.

## When to choose it

Take this module when a feature fails its evals after the context-layer work (prompt, retrieval, examples) is done, when data residency or cost pushes you toward self-hosting open weights, or when someone proposes "let's fine-tune" and you need to answer with numbers. If your feature runs on an API model and meets its targets, read lessons 02 and 08 and move on.
