# Model Families

"Which model should we use?" is rarely about one leaderboard winner. Models come in families with different trade-offs in quality, speed, price, privacy and how much you have to operate yourself. Knowing the families lets you shortlist two or three candidates in minutes and spend your effort on evaluating them (module 10).

## Frontier API models

The largest closed models, served only through a provider's API. They lead on hard, open-ended tasks: complex reasoning, long documents, coding, agentic tool use.

- **Buys:** the best quality available, no infrastructure, new capabilities first.
- **Costs:** the highest prices per token, data leaves your network (check retention and residency terms), rate limits, and versions that are deprecated on the provider's schedule.

Most providers ship each family in tiers (large, medium, small) so you can route within one vendor.

## Open-weight models

The weights are downloadable: you can run the model on your own cloud, on-premises or on a laptop, and fine-tune it (module 11).

- **Buys:** control over data and versions (nothing changes unless you change it), predictable cost at high volume, offline and on-device use.
- **Costs:** you operate inference (GPUs, scaling, quantization trade-offs), and the best open models usually trail the frontier on the hardest tasks.

### Open weights is not open source

Publishing weights is not the same as open source. The Open Source Initiative's definition for AI asks for the weights *and* the code *and* enough information about the training data to rebuild the system, under terms that allow any use. Most "open" models publish weights only, under a **model license** that may restrict use: acceptable-use policies, limits for very large companies, bans on using outputs to train other models. Some ship under permissive licenses such as Apache 2.0 or MIT. Read the license before building a product on a model; it is a dependency like any other.

## Small language models

Models from roughly one to a few dozen billion parameters. They are fast and cheap, fit on a single GPU or a phone, and are excellent at narrow tasks: classification, extraction, routing, short rewrites. Fine-tuned on your data, a small model often matches a large one on *your* task. Their limits: less world knowledge and weaker multi-step reasoning.

## Reasoning models and test-time compute

Reasoning models generate a hidden chain of **reasoning tokens** before the visible answer. Spending more compute at inference time (**test-time compute**) improves math, code, planning and multi-step problems. You pay for it: reasoning tokens are billed as output, latency grows from seconds to minutes, and many APIs expose a "thinking budget" or effort setting. Use them where correctness on hard problems matters more than speed, not for simple extraction.

## Multimodal, embedding and rerank models

- **Multimodal** models read images, audio, documents or video, and some produce images or speech; realtime voice models stream audio both ways.
- **Embedding** models turn text (or images) into vectors so similar meanings land close together. They power semantic search and RAG (module 04). They do not generate text and are far cheaper.
- **Rerankers** score how well each candidate document answers a query, and reorder retrieval results for precision.

## The cognitive core (emerging)

Andrej Karpathy describes a **cognitive core**: a small model that gives up encyclopedic memorized knowledge but keeps strong reasoning, and looks facts up through tools and retrieval. It is a design direction rather than a product: keep *knowledge outside* the model (search, databases, documents you control and can update) and *reasoning inside* it. Architectures built this way survive model swaps and stay current without retraining.

## Choosing

| Constraint | Leans toward |
| --- | --- |
| Hardest reasoning, quality first | frontier or reasoning model |
| High volume, simple task | small model, or a cheap-first cascade (lesson 06) |
| Strict latency (inline UI) | small or mid-tier model, no reasoning |
| Data cannot leave your network | open weights, self-hosted |
| Offline or on-device | small open-weight model, quantized |
| Search and similarity | embedding model plus reranker |

Shortlist by these constraints, then measure the candidates on your own examples. Public rankings decide less than you think (lesson 07).

> **Status as of October 2026:** frontier families include Anthropic Claude (Opus, Sonnet, Haiku), OpenAI GPT-5 and Google Gemini (Pro, Flash), each with reasoning modes. Open-weight families include Meta Llama, Alibaba Qwen, DeepSeek, Mistral, Google Gemma and OpenAI gpt-oss, under licenses ranging from Apache 2.0 and MIT to custom community licenses. Embedding and rerank models come from the same vendors plus specialists such as Cohere and Voyage, and open models such as BGE and E5.

## When to choose it

Start a new feature on a mid-tier API model: fast enough, cheap enough and good enough to learn what the task needs. Move to a frontier or reasoning model only when evals show the mid tier fails on cases that matter. Move down to a small or open-weight model when volume, latency, privacy or cost demand it and evals show it holds up. Choose open weights deliberately for control and data residency, not only for price: operating inference is real work.
