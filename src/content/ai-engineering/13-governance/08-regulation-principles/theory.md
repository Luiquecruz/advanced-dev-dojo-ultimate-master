# Regulation Principles

AI law changes every quarter and differs per country, but it is built from a small set of ideas that have been stable for years. Learn the ideas and every new law reads as a new combination of familiar parts; learn only the dates and you start over each time a bill passes. This lesson covers the shared principles, the roles laws assign, the main regulatory styles and the frameworks that turn principles into engineering work.

## The shared principles

| Principle | What laws ask | Engineering control |
| --- | --- | --- |
| Risk-based approach | stricter duties for uses that can harm people's rights, safety or access to essential services | risk tiers in the registry, a regulatory map per feature (lesson 11) |
| Transparency | tell people they interact with AI, label synthetic content, explain significant decisions | disclosure in the UI, provenance metadata (C2PA, watermarks), decision explanations |
| Human oversight | a competent person can understand, monitor, override and stop the system | approval gates, kill switches, override metrics (module 07, lesson 04) |
| Data protection | lawful basis, purpose limitation, minimization, data subject rights | the data gate of lesson 05, retention and erasure |
| Fairness and non-discrimination | outcomes must not discriminate against protected groups | bias evals on representative data, monitoring by segment (module 10) |
| Safety, robustness and security | the system performs as intended and resists misuse | evals, red teaming, the controls of module 12 |
| Accountability | someone answers for the system and can prove what it did | owners, documentation, impact assessments, audit logs (lessons 03, 04) |
| Contestability | affected people can challenge a decision and reach a human | appeal paths, review queues, decision records |

Almost every obligation in this module's jurisdictions maps to one of these rows. That is why the engineering controls of lessons 03 to 07 serve several laws at once.

## Roles: who owes what

Laws split duties along the value chain:

- **Developer or provider:** builds the model or system and places it on the market. Owes documentation, testing, risk management, and information for those downstream.
- **Deployer:** uses the system in its own product or operation. Owes appropriate use, oversight, monitoring, disclosure to affected people and, often, impact assessments.
- **Data controller** (data protection law): decides why and how personal data is processed, which is usually the deployer for prompts and outputs.

A company is often both: it deploys a provider's model and becomes the provider of the AI system it builds on top, especially when it changes the system's intended purpose or rebrands it.

## Regulatory styles

- **Horizontal, risk-based laws** cover AI across sectors with tiers of obligations: the EU AI Act, South Korea's AI Basic Act, Brazil's PL 2338/2023 (a bill).
- **Targeted rules** regulate specific uses or technologies: US state laws on hiring tools, chatbots, deepfakes and automated decisions; China's measures for generative services, deep synthesis, algorithm filing and content labeling.
- **Principles-based approaches** rely on existing regulators and guidance: the United Kingdom, and Japan's promotion-focused AI law.

Existing law applies in every style: data protection, consumer protection, anti-discrimination, product liability, sector rules (finance, health), copyright. "No AI law yet" never means "no rules".

## Soft law and standards

- **International principles:** the OECD AI Principles (2019, updated 2024), the UNESCO Recommendation on the Ethics of AI (2021), the G7 Hiroshima Process code of conduct (2023) and the Council of Europe Framework Convention on AI (the first binding international treaty on AI).
- **NIST AI Risk Management Framework:** four functions (Govern, Map, Measure, Manage) and a Generative AI Profile; voluntary, widely used as a common vocabulary.
- **ISO/IEC 42001:** a certifiable AI management system standard, like ISO 27001 for security. Certification shows auditors and customers that the processes exist.

Standards matter in practice: laws often presume conformity when you follow a harmonized standard or an approved code of practice.

## Thinking like a regulator

For each feature, ask the questions every law asks: who could be harmed and how badly (risk tier)? Do people know AI is involved (transparency)? Can a human intervene (oversight)? Is the data lawful and minimal (data protection)? Who answers for it, with what evidence (accountability)? Can the affected person contest it (contestability)? A feature with good answers is most of the way to compliance anywhere; then a lawyer maps the details per jurisdiction.

There is no single global AI law: horizontal AI laws, sector rules, soft frameworks and bills coexist, and which ones bind you depends on where the system is offered.

## When to choose it

Use the principle table as the first pass of any AI feature review, before looking up specific laws: it finds most gaps in an hour and produces controls that satisfy several jurisdictions at once. Bring in counsel to map the specific obligations once the feature, its users and its markets are known, and record the result in a dated regulatory map (lesson 11).
