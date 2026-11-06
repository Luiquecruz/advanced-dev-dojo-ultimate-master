# The EU AI Act

Regulation (EU) 2024/1689, the AI Act, is the most detailed horizontal AI law in force. Even outside Europe it matters: it applies to providers placing AI systems on the EU market and to providers and deployers elsewhere whose system's **output is used in the EU**, and other laws borrow its structure. This lesson gives an engineer's reading: tiers, roles, obligations, and timing.

## Four tiers of AI systems

| Tier | Examples | Consequence |
| --- | --- | --- |
| **Prohibited** (Art. 5) | manipulative or exploitative techniques causing significant harm, social scoring, predicting crime from profiling alone, untargeted scraping of facial images, emotion recognition at work or school, biometric categorization by sensitive traits, real-time remote biometric identification for law enforcement (narrow exceptions) | may not be placed on the market or used |
| **High-risk** (Art. 6) | safety components of regulated products (Annex I), and uses in Annex III: biometrics, critical infrastructure, education, employment and worker management, access to essential services (credit scoring, insurance pricing, public benefits), law enforcement, migration, justice and elections | the full set of requirements below |
| **Transparency** (Art. 50) | chatbots, generative systems, emotion recognition, deepfakes | disclosure and marking duties |
| **Minimal** | spam filters, recommendations in games, most internal tools | voluntary codes; AI literacy measures |

An Annex III system is not high-risk when it only performs a narrow procedural task or prepares a human assessment without materially influencing the outcome (Art. 6(3)), unless it profiles people; the provider must document that assessment and still register the system.

## General-purpose AI models

Separately from systems, providers of **general-purpose AI (GPAI) models** must keep technical documentation, give downstream providers the information they need, have a copyright policy (including respecting text-and-data-mining opt-outs) and publish a summary of training content (Art. 53). Models with **systemic risk** (presumed above 10^25 training FLOPs, or designated) must also evaluate and mitigate systemic risks, report serious incidents and ensure cybersecurity (Art. 55). The **GPAI Code of Practice** (transparency, copyright, safety and security chapters) is the voluntary way to show compliance.

## High-risk obligations

**Providers** of high-risk systems need a risk management system (Art. 9), data governance for training, validation and test data (Art. 10), technical documentation (Art. 11), **automatic logging** (Art. 12), instructions for deployers (Art. 13), designed-in **human oversight** (Art. 14), accuracy, robustness and cybersecurity (Art. 15), a quality management system (Art. 17), a conformity assessment, CE marking, registration in the EU database, and post-market monitoring with serious incident reporting.

**Deployers** must use the system according to its instructions, assign competent human oversight, monitor it, keep its logs (at least six months), inform workers before using it at work, tell people when it makes or assists decisions about them, and, for public bodies and deployers of credit scoring and life or health insurance pricing, run a **fundamental rights impact assessment** (Art. 27). Affected people gain a right to an explanation of decisions based on high-risk output (Art. 86).

Changing a high-risk system substantially, or putting your name on it, makes you its provider.

## Transparency duties (Art. 50)

- Systems that interact with people must make clear that they are AI, unless obvious.
- Providers of generative systems must **mark outputs in a machine-readable way** so they are detectable as AI-generated.
- Deployers of emotion recognition or biometric categorization must inform the people exposed.
- Deployers publishing **deepfakes**, or AI-generated text on matters of public interest without human editorial responsibility, must disclose it.

## Penalties

Up to €35 million or 7% of worldwide annual turnover for prohibited practices, up to €15 million or 3% for most other violations, up to €7.5 million or 1% for misleading information to authorities; lower caps apply to SMEs. GPAI providers face fines of up to €15 million or 3%.

## What this means for engineering

Most high-risk requirements are things this track already builds: logs (lesson 04, module 10 traces), human oversight (module 07), evals for accuracy and robustness (module 10), data governance (lesson 05), documentation and registries (lessons 03 and 06). The law adds the management system around them and the evidence.

The obligations phase in: prohibitions and AI literacy first, then the general-purpose model duties, then transparency and most of the framework, with high-risk duties for Annex III systems and for Annex I products scheduled later. The **Digital Omnibus on AI** amended that schedule and some duties, which shows how dates move: always confirm them against the official text before a compliance decision.

## When to choose it

Classify every AI feature against the four tiers as soon as EU users or EU-used outputs are in scope, and record the classification with its reasoning. Check which Article 50 transparency duty applies to the feature and whether a transition covers it (systems already on the market can have a later compliance date); if a feature touches an Annex III area, plan the high-risk work (risk management, logging, oversight, documentation, conformity) so it is complete before launch, and check the official application dates for the requirements that apply to your feature. For GPAI models you fine-tune substantially or release, check whether you have become a model provider.
