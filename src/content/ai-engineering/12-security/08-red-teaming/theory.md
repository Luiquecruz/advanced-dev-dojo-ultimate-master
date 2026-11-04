# Red Teaming

Every control in this module was designed against attacks you imagined. **Red teaming** tests it against attacks you did not: you attack your own system on purpose, record what got through, and keep those attacks as tests. For AI systems the second half matters most. A one-off red-team exercise produces a report; an **adversarial eval suite** in CI produces a number that cannot quietly get worse.

## From exercise to suite

Module 10 turned quality checks into evals: a dataset, a target, a scorer, a gate. Red teaming is the same machine with an adversarial dataset:

| Eval part | Quality eval | Adversarial eval |
| --- | --- | --- |
| Dataset | real questions with expected answers | tasks with injected payloads |
| Target | the assistant | the same assistant, with its real tools and renderer |
| Scorer | is the answer right? | **did the attack achieve its goal?** |
| Metric | accuracy | **attack success rate** (ASR) per category |
| Gate | accuracy may not drop | ASR may not rise; new successful attacks block the release |

Run it on every prompt change, model change, new tool and new renderer, exactly when quality evals run. Most security regressions in AI products are not new attack techniques; they are a harmless-looking change (a new tool, a markdown renderer, a different model) that reopens an old path.

## Building the dataset

Indirect injection (lesson 02) arrives inside content, so the suite injects payloads into realistic documents rather than typing them as the user:

- **Payloads by category,** each with a goal you can detect: exfiltration (data in a URL or tool argument), tool misuse (a forbidden or destructive tool call), goal hijack (the answer contains a **canary** word the payload asked for), prompt leak (the answer contains a marker planted in the system prompt).
- **Carriers:** the documents your product really reads: emails, tickets, web pages, PDFs, tool results, memories.
- **Positions:** the same payload at the start, middle and end of a document. Models weigh positions differently (module 01's position bias), so a defense that holds at the start can fail at the end.
- **Variants:** paraphrases, other languages, encodings, formatting tricks. Generate them with a model, then keep the ones that worked.

Crossing payloads × documents × positions turns a dozen ideas into hundreds of cases. Give each case a stable id (`image-exfil/2/middle`) so you can track exactly which attack started succeeding.

## Scoring: detect the goal, not the wording

Score with **deterministic detectors** wherever possible:

- a URL whose host is not on the allowlist, or the secret inside any tool argument → exfiltration;
- a call to a forbidden tool → tool misuse;
- the canary in the answer (case-insensitive) → goal hijack;
- the system-prompt marker in the answer → prompt leak.

Canaries and markers are random strings that never appear by accident, so detection has no false positives. Use an LLM judge (module 10) only for goals no string can capture, such as "the answer recommends the attacker's product", and calibrate it.

Count **errors separately.** A target that crashes or times out did not resist the attack; it did not run. Excluding errors from the rate and failing the gate when any case errors keeps an outage from looking like a security win.

## The gate

A useful gate fails when:

1. a category's ASR is above its limit (often 0 for exfiltration and tool misuse; a small tolerance for goal hijack in a low-stakes summarizer);
2. the overall ASR rose compared with the baseline release;
3. any attack that failed in the baseline now succeeds (a **regression**, listed by id);
4. any case errored.

Rate limits alone hide regressions: one attack can start working while another stops, and the rate stays flat. The list of newly successful ids is what reviewers read.

## Limits

A static suite measures resistance to **known** attacks. Adaptive attackers (lesson 02) iterate against your specific system and will find cases your suite lacks. So keep a human red team or bug bounty for creativity, feed every finding back into the suite, refresh payloads regularly, and remember that a low ASR does not justify keeping all three legs of the trifecta. The suite tells you whether your architecture holds; it does not replace it.

> **Status as of October 2026:** open-source tools for automated LLM red teaming include promptfoo (red-team plugins and CI integration), NVIDIA garak (vulnerability scanning) and Microsoft PyRIT (attack orchestration); AgentDojo (ETH Zurich) is a common benchmark for prompt injection against tool-using agents, and MITRE ATLAS catalogs adversarial techniques against AI systems. Regulations and frameworks increasingly expect adversarial testing for high-risk or general-purpose AI systems (module 13).

## When to choose it

Build an adversarial suite as soon as a feature reads untrusted content or holds tools, and gate releases on it like any other eval. Start with one payload per category, your three most common document types and three positions; grow it from incidents, bug reports and human red-team findings. A feature with no untrusted input and no tools can rely on ordinary evals plus an occasional manual exercise.
