# The Hugging Face Ecosystem

When an engineer says "we will use an open model", the next sentence usually contains a Hugging Face URL. Hugging Face is to open models roughly what GitHub plus npm is to code: a hub where weights, datasets and demos are published, plus a set of libraries that load, fine-tune and serve them. Knowing its parts lets you find a model, judge it, and know which library does what, even if your team works in TypeScript and someone else runs the Python.

## The Hub

The Hub hosts three kinds of git-based repositories:

- **Models.** Weights (ideally `.safetensors` files, lesson 08), tokenizer and config files, and a **model card**.
- **Datasets.** Training and evaluation data in Parquet, JSON, CSV or other formats, with a **dataset card** and a browser viewer.
- **Spaces.** Hosted demos and small apps (Gradio, Docker or static), often the quickest way to try a model.

Every repository has a full commit history. A download can be pinned to a **revision** (a commit hash), which is how you make "the model we evaluated" and "the model we deploy" the same artifact. **Gated** repositories require you to accept terms (and sometimes share contact details) before downloading; access is granted with a user or organization **access token**, which should be fine-grained and read-only in production.

The Hub also records relationships. A card's `base_model` metadata links fine-tunes, adapters, merges and quantized versions back to their origin, so you can follow a model's family tree, which matters for licenses and provenance.

## Reading a model card critically

A model card (Mitchell et al., 2018) is the repository's `README.md` with YAML metadata on top (`license`, `base_model`, `datasets`, `language`, `pipeline_tag`) and prose below. Read it like a vendor's datasheet: useful, written by the seller.

| Look for | Why |
| --- | --- |
| Who published it, and is the organization verified | anyone can upload; a re-upload of a famous model may not be the original |
| License and gating terms | decides whether you may ship it (below) |
| Base model and training recipe | SFT, DPO, RL, distilled from what (lesson 04) |
| Intended use and out-of-scope use | what the authors tested it for |
| Evaluation results, and how they were measured | leaderboard numbers need context (Benchmarks and Their Limits) |
| Training data description | languages, domains, cutoff, known gaps and biases |
| File formats | safetensors vs pickle, quantized variants, `trust_remote_code` needs |

A card with no license, no data description and no evaluation is a warning, not a gap to fill with optimism. **Dataset cards** (inspired by Datasheets for Datasets) answer the same questions for data: sources, collection, consent, personal data, license and known biases.

## The libraries

| Library | Role |
| --- | --- |
| `transformers` | model definitions and loading for thousands of architectures, tokenization, generation, pipelines |
| `datasets` | load, stream, transform and share datasets efficiently |
| `tokenizers` | fast tokenizers (Rust core) used by `transformers` |
| `huggingface_hub` | Python client and `hf` CLI: download, upload, pin revisions, manage repos |
| `PEFT` | LoRA, QLoRA and other parameter-efficient methods (lesson 03) |
| `TRL` | post-training: `SFTTrainer`, `DPOTrainer`, `GRPOTrainer`, reward modeling (lesson 04) |
| `accelerate` | runs the same training code on one GPU or many |
| `safetensors` | the safe tensor file format (lesson 08) |
| `smolagents` | a small agent library whose `CodeAgent` writes its actions as Python code, run in a sandbox; also a `ToolCallingAgent`, MCP tools and any model provider |

For serving, Hugging Face offers **Inference Providers** (one API routed to partner hosts) and **Inference Endpoints** (dedicated managed deployments). Self-hosted serving is covered in lesson 07.

## Licenses: open weights is not open source

The `license` field in a card is declared by the uploader. Common values and what they mean for a product:

- **Permissive** (`apache-2.0`, `mit`): commercial use, modification and redistribution allowed, with notices.
- **Responsible AI licenses** (`openrail` family): permissive with **use restrictions** that pass on to derivatives.
- **Custom community licenses** (`llama3.1`, `llama4`, `gemma` and others): commercial use usually allowed, with an acceptable use policy and conditions; Llama licenses, for example, add a threshold for very large companies and naming and attribution rules for derivatives.
- **Non-commercial** (`cc-by-nc-4.0`, research licenses): no product use.
- **`unknown` or missing**: treat as unusable until clarified.

A fine-tune or quantization **inherits** its base model's license terms, whatever its own card says. And "open" in a model name is marketing: the Open Source Initiative's **Open Source AI Definition** (OSAID 1.0, October 2024) requires the freedoms to use, study, modify and share, with the weights, the code and detailed training-data information. Most popular models are **open weights**, not open source by that definition.

> **Status as of October 2026:** the Hub hosts well over a million public models. `transformers` v5 (first release candidate December 2025) focuses on PyTorch and interoperability with vLLM, SGLang and llama.cpp. TRL reached 1.0 in March 2026. The ggml team behind llama.cpp joined Hugging Face in February 2026, and `safetensors` moved to the PyTorch Foundation in April 2026. TGI, Hugging Face's own inference server, is in maintenance mode, with vLLM and SGLang recommended instead.

## When to choose it

Use the Hub to find and compare open models and datasets, but treat every repository as a third-party dependency: check the publisher, pin a revision, read the license of the model and of its base, prefer safetensors, and read the card's evaluation claims as hypotheses for your own evals. Use the libraries when your team fine-tunes or serves open models; use Inference Providers or Endpoints when you want open models without operating GPUs.
