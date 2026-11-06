# Measuring Impact

"We ship twice as fast with agents" is a claim, not a measurement. Teams adopting coding agents need the same discipline for their delivery process that module 10 applied to model features: a baseline, metrics that reflect outcomes, and suspicion of impressions. The evidence so far shows why: developers' feelings about AI and their measured results can point in opposite directions.

## Measure outcomes, not output

The tempting metrics are the ones agents inflate for free: lines of code generated, suggestions accepted, pull requests opened, "percentage of code written by AI". None of them says whether users got working software sooner. More code is often a cost: more to review, test, secure and understand.

Two established frameworks give better lenses:

- **DORA metrics** (DevOps Research and Assessment) measure software delivery. Throughput: **change lead time**, **deployment frequency**, **failed deployment recovery time**. Instability: **change fail rate** and **deployment rework rate**. They describe the whole path from commit to production and are hard to game without actually improving.
- **SPACE** (Forsgren, Storey and colleagues, 2021) reminds you that productivity has five dimensions: **S**atisfaction and well-being, **P**erformance (outcomes), **A**ctivity (counts), **C**ommunication and collaboration, **E**fficiency and flow. Never judge with one dimension, and never with activity alone.

Add measures specific to agent work: review time per change and review queue length (the new bottleneck, lesson 05), defect and incident rates of agent-assisted changes, revert rate, and cost per change in model spend.

## What the evidence says

- **Controlled lab tasks show large speedups.** A 2022 GitHub study found developers completed a small, self-contained task (an HTTP server in JavaScript) about 55% faster with Copilot. Isolated greenfield tasks are where assistants shine.
- **Real work in mature codebases can look different.** METR's randomized controlled trial had 16 experienced open-source developers complete 246 real issues in large repositories they knew well, with AI tools allowed or disallowed per task. With the tools of the time they took **19% longer** with AI, although they had predicted a 24% speedup and still believed afterwards that AI had sped them up by about 20%.
- **The picture moves with the tools, and measuring it is hard.** METR later reported a follow-up with 57 developers and over 800 tasks whose raw estimates pointed to a speedup, and judged its own data unreliable: many developers refused to work without AI, withheld tasks from the no-AI condition, or ran several agents at once, which breaks time measurement. METR is redesigning the study. The lesson is not "AI slows developers"; it is that **perceived speedup is not evidence**, and that good measurement takes design.
- **At the organization level, AI amplifies.** An earlier DORA report associated a 25% increase in AI adoption with an estimated 1.5% decrease in delivery throughput and 7.2% decrease in delivery stability. A later *State of AI-assisted Software Development* report (nearly 5 000 respondents, 90% using AI) found AI adoption positively associated with throughput but still negatively associated with stability, and framed AI as an **amplifier** of existing strengths and weaknesses. Its AI Capabilities Model lists seven practices that amplify the benefits: a clear and communicated AI stance, healthy data ecosystems, AI-accessible internal data, strong version control practices, working in small batches, user-centric focus and quality internal platforms.

## Measuring your own team

1. **Baseline first.** Record DORA metrics, review times and incident rates before a rollout, or compare teams adopting at different times.
2. **Pick outcome metrics in advance**, and one or two guardrails (change fail rate, incidents) that must not get worse.
3. **Compare like with like.** Task size and type change when agents arrive; teams start picking agent-friendly tasks. Compare similar work.
4. **Combine numbers and surveys.** Satisfaction matters (SPACE), but self-reported speedup is the measurement METR showed to be unreliable.
5. **Count the whole cost:** model spend, review time and rework, not only the minutes saved writing code.
6. **Revisit regularly.** Tools change every few months; an old evaluation describes old tools.

Vendor-published productivity numbers rarely include stability or rework; read them as marketing until replicated.

## When to choose it

Measure before you scale an agent rollout, and before you claim a result to management. Use DORA metrics for delivery, SPACE to keep the human dimensions in view, and controlled comparisons where you can. Be most skeptical of the numbers that feel best: lines generated, acceptance rates and self-reported speed.
