# Local Inference and Quantization

Running an open model yourself (on a laptop, an on-premises server or rented GPUs) buys data control, pinned behavior and predictable cost at volume (Model Families). It also makes you the provider: you choose the runtime, the precision and the hardware, and you answer for latency and throughput. Most of those choices come down to one question: **does it fit in memory, and how fast can it be read?**

## The runtimes

| Runtime | Built for | Notes |
| --- | --- | --- |
| **Ollama** | developer laptops and simple single-user servers | one command to pull and run a model, local REST API with OpenAI-compatible endpoints, GGUF models |
| **llama.cpp** | CPUs, Apple silicon, consumer GPUs, edge devices | C/C++ engine behind many local tools; GGUF format; `llama-server` speaks an OpenAI-compatible API; the widest range of quantization levels |
| **vLLM** | high-throughput GPU serving | PagedAttention (the KV cache in pages, Kwon et al., 2023), continuous batching, prefix caching, many LoRA adapters on one base, tensor parallelism |
| **SGLang** | high-throughput GPU serving, multi-call and agent workloads | RadixAttention reuses shared prompt prefixes across requests; fast structured outputs |

Rule of thumb: Ollama or llama.cpp for one user or a few requests at a time; vLLM or SGLang when many users share a GPU. Others exist (MLX on Apple silicon, TensorRT-LLM, LM Studio). All expose OpenAI-compatible endpoints, so the `complete()` wrapper from Calling a Model works against any of them.

## Quantization

Models are trained in 16-bit precision (2 bytes per weight). **Quantization** stores weights with fewer bits: 8-bit (1 byte), 4-bit (half a byte), or less, using per-block scales so that small groups of weights share a range. Smaller weights mean less memory and faster decoding, at some cost in quality.

- **8-bit** (INT8, FP8): usually indistinguishable from 16-bit on most tasks. FP8 runs natively on recent data-center GPUs.
- **4-bit**: the common sweet spot. On GPUs, methods such as **AWQ** and **GPTQ** choose how to round using calibration data; in llama.cpp, "k-quants" such as `Q4_K_M` mix 4-bit and 6-bit blocks for about 4.5 to 5 bits per weight. Losses are modest on large models and more visible on small ones.
- **3-bit and below**: noticeable degradation, especially for reasoning, code and non-English text. Useful only when nothing larger fits.

Quantization error is task-dependent: a model that loses one point on a benchmark can lose ten on your extraction task. **Evaluate the quantized model on your own eval set**, not the 16-bit one.

**GGUF** is the single-file format of the ggml/llama.cpp ecosystem: weights in a chosen quantization plus the tokenizer, chat template and metadata, ready to load. GPU servers usually load safetensors checkpoints in 16-bit, FP8, AWQ or GPTQ instead.

## The memory math

Memory needed is roughly **weights + KV cache + runtime overhead**.

- **Weights** = parameters × bytes per weight. An 8B model: 16 GB in 16-bit, 8 GB in 8-bit, about 4.8 GB at ~4.8 bits per weight.
- **KV cache**: for every token in every active sequence, each layer stores a key and a value vector. Per token: `2 × layers × KV heads × head dimension × bytes per value`. It grows with **context length × concurrent sequences**, and it is often what runs out first on a server.
- **Overhead**: activations, CUDA graphs, fragmentation. Budget 1 to 2 GB, more on busy servers.

For mixture-of-experts models, memory follows the **total** parameters (every expert must be loaded) while compute per token follows the **active** parameters.

### Worked example

An 8B model with 32 layers, 8 KV heads (grouped-query attention) and a head dimension of 128, with a 16-bit KV cache:

- KV per token = 2 × 32 × 8 × 128 × 2 bytes = 131 072 bytes = **0.125 MB**.
- **Laptop, one user, 8 192-token context:** weights at ~4.8 bits ≈ 4.8 GB, KV = 8 192 × 0.125 MB = 1 GB, overhead ≈ 1 GB. Total ≈ **6.8 GB**: fits a 16 GB laptop with room for the operating system.
- **Server, 32 concurrent sequences of 8 192 tokens:** KV = 32 × 8 192 × 0.125 MB = **32 GB**. In 16-bit the weights add 16 GB: about **50 GB** with overhead. That needs an 80 GB GPU. A 24 GB GPU does not fit it even with 4-bit weights; you would cap concurrency or context, quantize the KV cache to 8-bit (halving it), or use two GPUs.

Concurrency and context length, not parameter count alone, size the hardware.

### Speed

Generating each token reads all the weights once, so single-stream decoding is limited by **memory bandwidth**: tokens per second ≈ bandwidth ÷ bytes of weights. A 4.8 GB model on a laptop with 100 GB/s tops out near 20 tokens per second; quantizing to fewer bytes makes it faster. Servers batch many sequences into each weight read, which is how vLLM and SGLang reach high total throughput.

> **Status as of October 2026:** Ollama, llama.cpp, vLLM and SGLang are the common open runtimes; the ggml team behind llama.cpp joined Hugging Face in February 2026, and Hugging Face's TGI is in maintenance mode. Recent GPUs support FP8 natively and newer ones 4-bit floating-point formats (MXFP4, NVFP4). Consumer GPUs commonly have 8 to 32 GB of memory, data-center GPUs 80 GB or more.

## When to choose it

Run models locally for development, offline work, private data on a laptop, or on-device features: Ollama or llama.cpp with a 4-bit GGUF. Self-host on GPUs with vLLM or SGLang when volume, data residency or latency justify operating a server, sized by the memory math for your real concurrency and context. Start at 8-bit, step down to 4-bit only when memory or speed requires it, and gate every quantization change with your evals. If no one on the team can be on call for a GPU server, a provider API or a managed endpoint is the honest choice.
