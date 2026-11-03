Start with the ladder table. Check each rung against all three targets (93% type accuracy, 99.5% valid JSON, 800 ms p95) from the cheapest up; the first one that passes is your rung, and the best-scoring rung below it is the baseline.
---
Rule out base models by policy before looking at scores: one has a non-commercial license, one has no license, pickle files, remote code and an anonymous publisher. For the rest, compute the serving memory: billions of parameters × bytes per weight, plus 64 × 1 024 × KV MB per token ÷ 1 024, plus 2 GB.
---
For `wren-8b-instruct`, the KV cache is 8 GB. In `bf16` the total is 26 GB, too much for 24 GB; `int4` fits but misses the accuracy target. One quantization in between both fits and passes. Full fine-tuning at 16 bytes per parameter does not fit the 48 GB training GPU.
---
For the data, stay between 4 000 and 8 500 training notes, keep the eval set at 500, redact personal data and cap synthetic notes at 20%. Depot codes change weekly, so they come from the lookup tool, retrieval or the prompt. The eval gate must rerun on new training data, a new base revision and a quantization change, and the checks must cover each point of the supply-chain policy.
