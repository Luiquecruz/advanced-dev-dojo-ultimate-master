# Preference and Reinforcement Tuning

Supervised fine-tuning (lesson 03) needs the right answer for every example. Many behaviors have no single right answer, only better and worse ones: helpful vs evasive, safe vs harmful. Other tasks have a right answer you can **check** but not easily **write down** step by step, such as a math proof or a program that passes tests. Preference and reinforcement tuning handle both. You will rarely run them yourself, but they shape every model you use, and this lesson gives you the vocabulary to read model cards and judge a provider's "reinforcement fine-tuning" offer.

## RLHF: learning from human preferences

**Reinforcement learning from human feedback** (Christiano et al., 2017; made famous by InstructGPT, Ouyang et al., 2022) runs in three stages:

1. **SFT** on demonstrations of good answers.
2. **Reward model.** Humans compare pairs of answers to the same prompt; a model learns to predict which one people prefer, producing a score.
3. **RL.** The model generates answers, the reward model scores them, and an RL algorithm (PPO in the original work) pushes the model toward higher scores, with a penalty for drifting too far from the SFT model.

InstructGPT's 1.3B model was preferred by labelers over the 175B GPT-3 base: alignment to what people want mattered more than size. RLHF also explains some flaws you met in How LLMs Behave: if raters reward answers that agree with them, the model learns **sycophancy**; if the reward model has blind spots, the policy finds them (**reward hacking**). **RLAIF** replaces some human labels with AI feedback, as in Anthropic's Constitutional AI (2022), where a written set of principles guides the AI judge.

## DPO: preferences without the RL loop

**Direct Preference Optimization** (Rafailov et al., 2023) showed that the same objective can be optimized directly on preference pairs `(prompt, chosen, rejected)` with a simple classification-style loss against a frozen reference model. No separate reward model, no sampling loop, far more stable to train. DPO and its variants became the default way to apply preferences to open models, and libraries such as TRL ship a `DPOTrainer`. For a product team, DPO is the realistic option when you have pairs of "this answer, not that one" from reviewers or user feedback.

## RL with verifiable rewards and GRPO

When correctness can be checked by a program (a math answer matches, code passes unit tests, output satisfies a constraint), the reward model can be replaced by a **verifier**. This is **reinforcement learning with verifiable rewards (RLVR)**, named in the Tülu 3 report (Lambert et al., 2024): the reward is positive for a verified correct answer and zero otherwise. Verifiers are much harder to fool than learned reward models, though not impossible (a model can learn to special-case the tests).

**GRPO** (Group Relative Policy Optimization, introduced in DeepSeekMath, Shao et al., 2024) is the RL algorithm that made this cheap. Instead of training a separate value model as PPO does, it samples a **group** of answers for each prompt, scores them, and pushes the model toward answers that beat the group's average. DeepSeek-R1 (2025) used GRPO with rule-based rewards for answer correctness and format, and showed long step-by-step reasoning emerging from RL. RL on verifiable rewards is the main recipe behind **reasoning models** (Model Families).

| Method | Needs | Learns | Typical use |
| --- | --- | --- | --- |
| SFT | correct demonstrations | imitate outputs | format, style, narrow tasks |
| RLHF | preference labels, a reward model, an RL loop | maximize a learned preference score | general assistant alignment |
| DPO | preference pairs | prefer chosen over rejected | tone, helpfulness, policy from feedback |
| RLVR with GRPO | prompts plus a verifier | maximize checked correctness | math, code, reasoning, constraint following |
| Distillation | a strong teacher model | imitate the teacher | small, fast models with borrowed skill |

## Distillation

**Knowledge distillation** (Hinton et al., 2015) trains a small **student** to imitate a large **teacher**. With language models the common form is simple: the teacher generates answers (often with its reasoning) for many prompts, and the student is fine-tuned on them. DeepSeek released small models distilled from R1 this way, and many small open models are distilled from larger ones. Distillation is how a product team gets a cheap, fast model that does one thing like a frontier model, provided the teacher's license and terms of use allow training on its outputs; several providers forbid using outputs to build competing models.

## What it means for an engineer

- Read model cards for the post-training recipe: SFT, DPO, RL with verifiable rewards, distilled from which teacher. It tells you what the model was optimized for.
- Preference data from your product (thumbs up and down, edits, A/B choices) is a valuable asset. Store pairs, not just scores.
- A reward is a specification. Whatever it fails to penalize, the model may learn to do. The same lesson applies to verifiers in harness engineering (module 08).

> **Status as of October 2026:** reasoning models across vendors are trained with large-scale RL on verifiable rewards; GRPO and its variants are the common open recipe, implemented in Hugging Face TRL (`GRPOTrainer`) and other open frameworks. DeepSeek-R1 was published in Nature in 2025. Some API providers offer reinforcement fine-tuning, where you supply prompts and a grader, for selected reasoning models.

## When to choose it

Most teams never run preference or RL tuning; they benefit from it through the models they use. Choose DPO when you have reliable preference pairs and a stable behavior that prompting and SFT do not fix. Choose RL with a verifier when correctness is checkable by code and the task is valuable enough to pay for many sampled attempts per prompt. Choose distillation when a large model already does the task well and you need it cheaper and faster, after checking that the teacher's terms allow it.
