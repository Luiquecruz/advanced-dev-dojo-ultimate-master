# Synthetic Data

Fine-tuning needs examples, and real examples are often scarce, private or unevenly distributed: thousands of easy cases, a handful of the rare ones that matter. **Synthetic data** is training (or evaluation) data written by a model. It is now part of nearly every model's training, from frontier post-training to the small fine-tunes a product team runs. Used well, it fills gaps cheaply. Used carelessly, it bakes a model's mistakes and blind spots into the next model.

## Why teams generate data

- **Rare cases.** The exception type that appears 30 times a year, the edge case the eval found. Generate variations around real seeds.
- **Cold start.** A new feature has no logs yet. Generate a first dataset, then replace it with real data as it arrives.
- **Privacy.** Real conversations contain personal data you may not train on. Synthetic look-alikes keep the structure without the people.
- **Distillation.** A strong teacher writes answers (and reasoning) for a small student (lesson 04).
- **Eval expansion.** More test cases for categories the golden set covers thinly, used with care (see contamination below).

## How it is generated

| Approach | How | Watch for |
| --- | --- | --- |
| Seeded variation | rewrite real examples with different wording, names, lengths, languages | stays close to real distribution; check labels still hold |
| Self-Instruct style | a model expands a few seed tasks into many new instructions and answers (Wang et al., 2022) | drifts toward what the model finds easy |
| Evolution | rewrite instructions to be harder or more specific (Evol-Instruct, WizardLM) | difficulty without correctness |
| Grounded generation | generate questions and answers from your own documents | answers must be checked against the source |
| Personas and attributes | vary user type, tone, domain and constraints explicitly | diversity by design instead of by luck |

Microsoft's phi models showed that carefully generated "textbook quality" synthetic data can train strong small models ("Textbooks Are All You Need", 2023), and Hugging Face's Cosmopedia published a large open synthetic corpus built the same way. The lesson for product teams: **the prompt that generates the data is a design artifact**. It decides coverage, diversity and difficulty, so version it and review it like code (Prompts as Code).

## Filtering is the real work

Raw generations are a draft. A typical pipeline keeps only what survives every filter:

1. **Validity.** Schema validation and parsing, as in Structured Outputs.
2. **Correctness.** A verifier where one exists (the code runs, the SQL returns the expected rows, the extracted field appears in the source); otherwise a calibrated judge with a rubric (module 10), plus human spot checks.
3. **Deduplication.** Exact and near-duplicate removal (embedding similarity), both inside the synthetic set and against the eval set.
4. **Diversity and balance.** Count labels, lengths, languages and topics; generate more where coverage is thin, drop surplus where it is heavy.
5. **Provenance.** Mark every example as synthetic, with the generator model, prompt version and date, so you can remove or reweight it later.

## The risks

- **Model collapse.** Shumailov et al. (Nature, 2024) showed that models trained recursively on their own generated data lose the tails of the distribution: rare cases disappear first, then output narrows. Follow-up work (Gerstgrasser et al., 2024) found that **accumulating** synthetic data alongside the original real data avoids collapse, while **replacing** real data with synthetic causes it. Keep real data as the anchor and cap the synthetic share.
- **Bias amplification.** The generator's preferences (topics, names, dialects, viewpoints) become the dataset's preferences, and the fine-tuned model inherits them more strongly.
- **Homogenization.** Synthetic text sounds alike: the same phrasings, the same structure. The fine-tuned model then fails on messy real inputs. Test on real data.
- **Baked-in errors.** A confident wrong answer from the generator becomes a training label. Without a correctness filter you are distilling mistakes.
- **Eval contamination.** If the same model writes the eval set and the training set, or near-duplicates leak between them, scores go up while real quality does not. Keep the eval set real, frozen and deduplicated against all training data.
- **Terms of use.** The generator's license or terms may forbid training other models on its outputs (lesson 04).

> **Status as of October 2026:** synthetic data is standard in post-training of both frontier and open models. Open tooling includes distilabel (Argilla, part of Hugging Face) and generation pipelines in vendor toolkits; open synthetic corpora such as Cosmopedia are published on the Hub with dataset cards. Research on how much synthetic data is safe to mix keeps moving; treat any fixed ratio as a starting point to evaluate, not a rule.

## When to choose it

Generate synthetic data to fill specific, measured gaps: rare classes, new features without logs, privacy-sensitive inputs, or a student learning from a teacher. Seed it from real examples, filter it with validators and verifiers, mark its provenance, cap its share and keep real data as the anchor. Never let it touch the eval set. If you cannot describe the filter that removes bad examples, you are not ready to train on them.
