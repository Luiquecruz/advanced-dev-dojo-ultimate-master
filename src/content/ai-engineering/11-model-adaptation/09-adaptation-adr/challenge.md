Write the adaptation ADR for **Waypoint**, the delivery-exception parser of a parcel carrier.

## Briefing

When a delivery fails, the driver types a free-text note ("gate locked, cust not answering, retry tmrw"). Waypoint turns each note into a JSON record with one of 14 exception types, a retry flag and the depot code that handles the retry. The rescheduling system reads the record.

- **Volume:** 400 000 notes a day; each serving replica handles up to **64 concurrent sequences** of up to **1 024 tokens**.
- **Targets** on the frozen 500-note eval set: at least **93%** exact match on the exception type, at least **99.5%** valid JSON, p95 latency at most **800 ms**.
- **Privacy:** notes contain customer names, phone numbers and addresses. Retailer contracts forbid sending them to third-party APIs, so inference runs on the carrier's own GPUs. Personal data must be redacted from anything used for training.
- **Depot codes** change every week.
- **Data:** 9 000 labeled notes from the last year. **500** of them are the frozen eval set and never used for training. Three exception types have fewer than 60 examples each. Platform policy: synthetic examples may make up at most **20%** of a training set. The LoRA pilot used 6 000 notes; its learning curve flattened after **4 000**.
- **Training hardware:** one rented **48 GB** GPU. Before activations, full fine-tuning needs about **16 bytes per parameter**, LoRA about **2** (the frozen 16-bit base) and QLoRA about **0.5**.
- **Serving hardware:** one **24 GB** GPU per replica. Estimate memory as: weights GB = billions of parameters × bytes per weight (`bf16` 2, `fp8` 1, `int4` 0.5), plus KV cache GB = 64 × 1 024 × KV MB per token ÷ 1 024, plus **2 GB** overhead.
- **Platform:** the inference team operates **vLLM** and **SGLang** in production; Ollama runs on developer laptops only.
- **Supply-chain policy:** a license that allows commercial use, a verified publisher, a pinned revision with file hashes, safetensors files only, no remote code, and an AI-BOM entry for every model and adapter.

Pilot results on the eval set, all self-hosted on `wren-8b-instruct` in `bf16` except the last row:

| Rung | Setup | Type accuracy | Valid JSON | p95 latency |
| --- | --- | --- | --- | --- |
| `prompt` | zero-shot, instructions and JSON schema | 81.0% | 97.2% | 340 ms |
| `retrieval` | plus 3 excerpts from the exception handbook | 84.5% | 98.1% | 610 ms |
| `examples-and-tools` | plus 8 similar labeled notes and a depot lookup tool | 88.9% | 99.4% | 720 ms |
| `fine-tuning` | LoRA on 6 000 notes, short prompt, depot lookup tool | 95.0% | 99.9% | 290 ms |
| (not allowed) | frontier API model, zero-shot | 96.4% | 99.8% | 1 700 ms |

The fifth rung, `training` (pretraining a model), was not piloted.

Base model candidates (LoRA pilot on 6 000 notes, `bf16`):

| Model id | Parameters | KV MB per token | License | Weight files | Publisher | Pinned revision | Type accuracy | Valid JSON |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `wren-8b-instruct` | 8 B | 0.125 | Apache-2.0 | safetensors | verified organization | `a41c9e7` | 95.0% | 99.9% |
| `kestrel-9b-chat` | 9 B | 0.25 | custom, non-commercial research only | safetensors | verified organization | `77d02b1` | 95.6% | 99.9% |
| `heron-8b-merge` | 8 B | 0.125 | not stated | `.bin` (pickle), needs `trust_remote_code` | anonymous account | `c0ffee1` | 96.1% | 99.8% |
| `osprey-32b-instruct` | 32 B | 0.25 | Apache-2.0 | safetensors | verified organization | `5be2a90` | 96.5% | 99.9% |

Quantization pilot for the fine-tuned `wren-8b-instruct` (adapter merged):

| Quantization | Bytes per weight | Type accuracy | Valid JSON |
| --- | --- | --- | --- |
| `bf16` | 2 | 95.0% | 99.9% |
| `fp8` | 1 | 94.7% | 99.9% |
| `int4` | 0.5 | 92.4% | 99.6% |

## Task

In `adr.ts`, export two constants.

**`adr`**, the record:

- `id`: a positive integer; `title`: at least 10 characters; `status`: `'accepted'`; `layer`: `'model'`.
- `context`: at least 80 characters; mentions the eval targets (accuracy or eval), and privacy (personal data, contracts or self-hosting).
- `decision`: at least 40 characters, starts with `We will`.
- `alternatives`: at least two `{ option, reason }` entries with distinct `option` texts (at least 3 characters) and a `reason` of at least 20 characters.
- `consequences`: `{ positive, negative }`, each a list with at least one item of at least 15 characters.

**`adaptationPlan`**, the plan:

- `rung`: one of `'prompt'`, `'retrieval'`, `'examples-and-tools'`, `'fine-tuning'`, `'training'`.
- `method`: `'lora'`, `'qlora'` or `'full'` when the rung changes weights, otherwise `null`.
- `data: { trainingExamples, evalExamples, redactPersonalData, maxSyntheticShare }`.
- `freshFacts`: where the weekly depot codes come from: `'prompt'`, `'retrieval'`, `'tools'` or `'weights'`.
- `evalGate: { minTypeAccuracy, minValidJson, baseline, rerunOn }`: thresholds as fractions (`0.93`), the rung the candidate must beat, and the events that rerun the evals, from `'new-training-data'`, `'base-model-revision'`, `'quantization-change'`, `'runtime-upgrade'`, `'weekly-schedule'`.
- `serving: { engine, quantization, estimatedGpuMemoryGb }`: engine from `'vllm'`, `'sglang'`, `'ollama'`, `'llama.cpp'`, `'provider-api'`; quantization from the quantization table.
- `supplyChain: { baseModel, revision, weightsFormat, trustRemoteCode, checks }`: checks from `'license-allows-commercial-use'`, `'verified-publisher'`, `'pinned-revision'`, `'file-hashes'`, `'safetensors-only'`, `'malware-scan'`, `'signature-verification'`, `'internal-mirror'`, `'ai-bom-entry'`.

The plan must be coherent with the briefing:

1. The rung is the lowest one whose pilot meets every target; the baseline is the best rung below it. The method fits the 48 GB training GPU.
2. Training examples are between the learning-curve plateau and what remains after the eval set; the eval set stays at 500; personal data is redacted; synthetic share is within policy. Weekly depot codes do not live in the weights.
3. The eval gate is at least as strict as the targets and reruns on new training data, a new base model revision and a quantization change.
4. The engine is one the platform runs in production. The chosen base model and quantization meet the targets in the pilots, and the memory estimate is within 10% of the formula and fits 24 GB.
5. The base model passes the supply-chain policy, the revision matches the table, remote code is off, and the checks cover every point of the policy.

The tests check structure and coherence, not your wording.
