# The Global Regulatory Map

A product that launches in Brazil, the EU and California does not face "AI regulation"; it faces a dozen specific obligations, each from a specific instrument, each attached to a specific feature, each with its own start date. A **regulatory map** makes that list explicit and keeps it current. This lesson compares the main jurisdictions and builds the map as data.

## The jurisdictions at a glance

| Jurisdiction | Style | Main instruments for AI |
| --- | --- | --- |
| European Union | horizontal, risk-based | AI Act (tiers, GPAI, Art. 50 transparency), GDPR (Art. 22 automated decisions, DPIAs) |
| Brazil | data protection now, AI bill pending | LGPD (Art. 20 review of automated decisions, RIPD), ECA Digital, PL 2338/2023 (bill) |
| United States | no federal AI statute; sector and state rules | FTC Act Section 5, fair lending (ECOA), state laws: Colorado SB 26-189, California (companion chatbots, AI Transparency Act, CCPA automated decision rules), New York City Local Law 144 (hiring audits) |
| United Kingdom | principles-based, sector regulators | UK GDPR automated decision rules (as reformed by later legislation), regulator guidance |
| China | targeted measures | generative AI services (security assessment, algorithm filing), deep synthesis, AI content labeling, anthropomorphic AI services |
| South Korea | horizontal | AI Basic Act: high-impact AI duties, generative AI notice and labeling, domestic representative for some foreign providers |
| Japan | promotion-focused | AI Promotion Act and AI Basic Plan: cooperation duties, no penalties |
| International | soft law and treaty | OECD Principles, UNESCO Recommendation, Council of Europe Framework Convention, G7 Hiroshima code of conduct |

Patterns repeat across the table. **Transparency** for chatbots and synthetic content appears in the EU, California, China and South Korea. **Automated decisions** about credit and employment trigger rights in the EU (GDPR and the AI Act), Brazil (LGPD Art. 20), the UK, Colorado, California and South Korea. **Hiring** is regulated almost everywhere. That is why lesson 08's principles carry so far: one well-built decision review path serves five jurisdictions.

## The map as data

A regulatory map has two inputs and one output:

- **A rules table**, reviewed and dated: each rule has an id, a jurisdiction, the source instrument and article, a status (law or bill), the date it applies from, a condition and the obligation in plain words.
- **A product profile** in the same vocabulary: the markets, and for each feature what it does (`chatbot`, `credit-decision`, `synthetic-media`), which data it touches (`personal`, `sensitive`, `children`) and who it affects (`consumers`, `job-applicants`, `minors`).
- **Obligations**: every rule that covers a market and matches a feature, with the source and a status on a given date: `applies`, `upcoming` (a law with a future date) or `proposed` (a bill to watch).

```ts
mapObligations(profile, RULES, '2026-11-01');
// { ruleId: 'eu-ai-act-annex3-credit', featureId: 'credit-limit', status: 'upcoming', appliesFrom: '2027-12-02', ... }
```

Two details make it work. **Hierarchy:** a US federal rule covers every US state market, but a California rule does not cover Colorado. **Dates:** evaluate status on a date you pass in, so the same table answers "what applies today?", "what applies at launch?" and "what will the next deadline add?".

## Keeping it honest

- **Date the table and review it every quarter.** Laws in this module have changed repeatedly: dates moved, laws were replaced before they applied, bills stalled. A table older than a quarter should say so loudly.
- **Cite the source on every obligation**, so a reviewer can check it and a lawyer can correct it.
- **Separate law from bills.** Bills are watch items; treating them as obligations wastes effort, ignoring them leaves you unprepared.
- **Keep counsel in the loop.** A table is a simplified summary; real obligations depend on exemptions, thresholds and definitions. The map tells you which questions to ask, not the final answers.
- **Map to controls.** Each obligation should point to the control that satisfies it (lessons 03 to 07) and its evidence; that is the governance map of the ADR that follows.

Regulatory facts change: confirm each row against the official text before a compliance decision.

## When to choose it

Build the map before launching in a new market or shipping a feature that decides about people, generates media, talks to consumers or reaches minors. Keep it next to the product's governance plan, rerun it when features or markets change, and review the rules table every quarter with legal.
