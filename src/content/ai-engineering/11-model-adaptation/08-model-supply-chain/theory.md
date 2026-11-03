# The Model Supply Chain

A downloaded model is a dependency like an npm package, with two differences that make it riskier. Some model formats **execute code when loaded**, so `load(model)` can be `run(attacker_code)`. And the weights themselves are opaque: no reviewer can read 8 billion numbers and spot a backdoor. This lesson covers how model artifacts are attacked and the controls that make them verifiable: safe formats, provenance, signing and an AI bill of materials. Module 12 extends this to tools and MCP servers.

## Pickle: code execution on load

PyTorch checkpoints traditionally use Python's **pickle** format (`.bin`, `.pt`, `.pth`, `.ckpt`). Pickle does not just store data: it stores instructions to rebuild objects, and those instructions may call any Python function. A crafted file runs a reverse shell, steals credentials or plants files the moment someone calls `torch.load` on it, before any weights are used.

This is not theoretical:

- In 2024 JFrog reported about 100 models on Hugging Face with malicious payloads, mostly pickle-based PyTorch files, including one that opened a reverse shell.
- In February 2025 ReversingLabs found models using a deliberately **broken** pickle compressed with 7z (named "nullifAI"): the scanner failed on the malformed file, while PyTorch had already executed the payload at the start of the stream.
- PyTorch 2.6 made `torch.load` default to `weights_only=True`, a restricted unpickler; CVE-2025-32434 then showed that versions up to 2.5.1 could still be exploited even with that flag.

Other paths to code execution: Keras models with `Lambda` layers, `joblib` files, and Hugging Face's `trust_remote_code=True`, which runs Python files from the model repository by design. Even safe formats need patched parsers: runtimes have had memory-safety bugs in model file parsing.

## Safetensors

**Safetensors** stores a small JSON header (tensor names, types, shapes, offsets) followed by raw tensor bytes. There is nothing to execute: loading a file reads numbers. It also loads fast (memory mapping, lazy loading). A 2023 security audit by Trail of Bits, commissioned by Hugging Face, EleutherAI and Stability AI, supported making it the default, and it is now the standard format on the Hub. **Rule: load only safetensors (or GGUF from a trusted publisher) in production; convert or reject pickle checkpoints; never set `trust_remote_code` for a repository you have not reviewed at a pinned revision.**

## Beyond the file format

A safe format proves the file will not run code. It does not prove the weights are the ones you think, or that they behave as advertised.

- **Impersonation and typosquatting.** `meta-llama` vs `meta-l1ama`; a re-upload of a famous model with a modified file.
- **Namespace reuse.** Unit 42 (2025) showed that when an author's account is deleted, someone else can register the same name, so pipelines that load models by name alone receive the attacker's model.
- **Mutable references.** Loading the latest revision of a repository means the artifact can change under you.
- **Backdoored weights.** A model can be trained to behave normally except on a trigger phrase ("Sleeper Agents", Anthropic, 2024); no scanner reads that from the weights. Only provenance and behavioral evals help.
- **Poisoned data.** Fine-tuning on a poisoned dataset plants behavior the same way. Datasets are part of the supply chain.

## Controls

| Control | What it gives you |
| --- | --- |
| Verified publisher | the repository belongs to the organization that trained the model |
| Pinned revision and file hashes | the deployed bytes are the evaluated bytes (record SHA-256 of each file) |
| Safe formats only | loading cannot execute code |
| Malware and pickle scanning | catches known bad patterns; a heuristic, not a guarantee |
| Signatures | cryptographic proof of who produced the files: the OpenSSF **model-signing** project (Sigstore-based, v1.0 in April 2025) signs whole model directories |
| Internal mirror or registry | production pulls from a reviewed copy, never directly from the public Hub |
| Behavioral evals | your task, safety cases and trigger probes, rerun on every new artifact |
| AI bill of materials | a record of every model, adapter and dataset in the product |

## The AI bill of materials

An **AI-BOM** extends the software bill of materials to models and data. For each model it records: name and publisher, revision and file hashes, base model and adapters, quantization, license, training and fine-tuning datasets (with their own provenance and licenses), and where it runs. Two standards cover it: **CycloneDX** (machine-learning BOMs since version 1.5, with model cards as structured data) and **SPDX 3.0** (AI and Dataset profiles). An AI-BOM answers the questions an incident or an audit asks: which products use the model that was just found to be backdoored, under which license did we ship this fine-tune, which datasets trained it.

> **Status as of October 2026:** the Hub scans uploads for malware and unsafe pickle imports and works with third-party scanners, and marks unsafe files without blocking downloads. Safetensors joined the PyTorch Foundation in April 2026. OWASP lists supply chain as LLM03 in its 2025 Top 10 for LLM Applications. Under the EU AI Act, a company that substantially modifies a general-purpose model (indicatively, with more than a third of the original training compute) can become its provider for the modification.

## When to choose it

Apply these controls the first time a model file enters your infrastructure, whether you download open weights, fine-tune one or receive an adapter from a vendor. At minimum: safetensors only, verified publisher, pinned revision with hashes, no `trust_remote_code` without review, and an AI-BOM entry. Add signing, an internal mirror and trigger probes in your evals when models reach production or customers. If you only call provider APIs, your supply chain is the provider contract and the pinned model version (Model Families), but any embedding or reranker you download is back in scope.
