# How LLMs Behave

You do not need to know how to train a model to build with one, but you do need an accurate picture of what it does with your input. Most production bugs in AI features come from a wrong mental model: expecting determinism, trusting fluent answers, or forgetting that the model only sees what you send.

## Next-token prediction

A large language model reads a sequence of **tokens** and predicts a probability distribution over the next token. Generation is a loop: pick a token from that distribution, append it, predict again, until a stop token or a limit. Pretraining on vast amounts of text teaches it language and facts; post-training (instruction tuning, reinforcement learning from feedback) teaches it to follow instructions, hold a conversation and decline some requests.

Everything else follows from this: the model produces *plausible continuations*, not looked-up facts.

## Tokens and the context window

Tokens are sub-word pieces: in English roughly four characters or three quarters of a word; code, numbers and many other languages need more tokens for the same content. Tokenization explains classic quirks: models can struggle to count letters in a word or compare long numbers, because they never see individual characters.

The **context window** is the maximum number of tokens one call can hold, input and output together. It is the model's entire working memory for that call. The model is stateless: a chat "remembers" earlier turns only because your code resends them. Whatever is not in the window does not exist for the model.

**Input tokens** (what you send) and **output tokens** (what it generates) differ in price and speed: input is read in parallel, output is generated one token at a time, so output dominates latency and usually costs several times more per token.

## Sampling

The model gives probabilities; a **sampler** picks the token.

- **Temperature** reshapes the distribution: low values make likely tokens even likelier (focused, repetitive); high values flatten it (varied, riskier). Temperature 0 approximates always picking the most likely token.
- **Top-p** (nucleus sampling) samples only from the smallest set of tokens whose probabilities add up to *p*.
- **Seed** asks the provider to reproduce the same random choices. It is best-effort.

Even at temperature 0 with a fixed seed, outputs are **not guaranteed identical**. Requests are batched with other users' traffic, which changes the order of floating-point operations; some architectures route tokens through different experts depending on the batch; and providers update serving infrastructure and model snapshots. Design for variance: compare outputs by properties (valid JSON, correct label, cites a source), never by exact string.

## Limits that shape architecture

| Behavior | What happens | What your code does |
| --- | --- | --- |
| **Hallucination** | Fluent, confident, wrong statements and invented citations | Ground answers in retrieved sources, validate outputs, allow "I don't know" |
| **Knowledge cutoff** | Training data ends at a date; newer facts are unknown | Put current facts in the context (retrieval, tools) |
| **Sycophancy** | Agrees with the user, drops a correct answer under pushback | Neutral prompts, do not reveal the answer you hope for, test with evals |
| **Position bias** | Information in the middle of a long context is used less ("lost in the middle"); judges favor the first option | Put key instructions and evidence at the start or end, shuffle options when judging |
| **Refusals** | Declines requests, sometimes benign ones (over-refusal) | Treat a refusal as a distinct outcome, not an answer |
| **Prompt sensitivity** | Small wording changes shift outputs | Version prompts and test them (module 02) |

None of these is a bug that the next model release removes completely. Newer models hallucinate less and refuse more precisely, but the classes of behavior remain, which is why this track's fake model reproduces them.

## Pitfalls

- Assuming temperature 0 makes tests reproducible and asserting exact strings.
- Asking the model about events after its cutoff and trusting the answer.
- Stuffing 200 pages into the context and expecting every page to be used equally.
- Asking "Is my solution correct?" and taking agreement as evidence.

> **Status as of October 2026:** frontier context windows range from about 128K to over 1M tokens, with smaller output limits (often 8K–128K tokens). Knowledge cutoffs typically sit several months to a year before a model's release. Some reasoning models ignore or reject sampling parameters such as temperature. Research on batch-invariant inference has shown that deterministic serving is possible, but it is not the default at most providers.

## When to choose it

Reach for a model when the task needs language understanding or generation and a plausible, checkable answer is valuable: classification of free text, extraction, summarization, drafting, translation, code assistance. Prefer plain code when the task has an exact, deterministic answer (arithmetic, lookups, date math, validation rules, routing on known fields), when a wrong answer is costly and cannot be checked, or when the same input must always produce the same output. Most good systems combine both: code decides and verifies, the model handles the fuzzy part.
