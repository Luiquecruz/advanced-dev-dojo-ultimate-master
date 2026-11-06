# Brazil: LGPD and PL 2338

Brazil has no AI-specific statute in force, and AI is not unregulated there. The **LGPD** (Law 13.709/2018) governs every AI system that touches personal data, the data protection authority (**ANPD**) has made AI an enforcement priority, and an AI bill, **PL 2338/2023**, is moving through the National Congress: check the Chamber of Deputies' tracking page for its current stage. Separate what binds today from what may come.

## What binds today: the LGPD

The LGPD applies to processing in Brazil, aimed at people in Brazil, or of data collected in Brazil, wherever the company sits. For AI systems:

| LGPD | What it requires | In your system |
| --- | --- | --- |
| Art. 6, principles | purpose, adequacy, necessity (minimization), transparency, security, prevention, non-discrimination, accountability | the data gate of lesson 05 |
| Art. 7 and 11, legal bases | one of ten bases for personal data; stricter bases for sensitive data (health, biometrics, ethnicity, religion...) | a declared purpose and basis per AI use |
| Art. 14 | children's and adolescents' data in their best interest | age-aware flows, no profiling of minors by default |
| Art. 18 | access, correction, deletion, information about sharing | erasure that reaches traces, memories and embeddings |
| **Art. 20** | the right to request **review of decisions made solely by automated processing** that affect the person's interests (credit, profiles, employment), and to receive information about the criteria and procedures used | a review path and decision records with the main factors |
| Art. 33 | international transfers need a mechanism (adequacy, standard clauses...) | provider region and contract checks |
| Art. 37, 38 | records of processing; a data protection impact report (RIPD) when the ANPD asks, expected for high-risk processing | processing records, an impact report per AI feature |
| Art. 46, 48 | security measures; notify the ANPD and data subjects of relevant incidents | incident response that covers AI leaks |

Art. 20 is Brazil's closest thing today to an AI decision right. A later amendment removed the requirement that a natural person do the review, but re-running the same model rarely serves its purpose; and if a company withholds its criteria as trade secrets, the ANPD may audit for discrimination.

Sanctions (Art. 52) range from warnings to fines of up to 2% of revenue in Brazil, capped at R$50 million per infraction, and to blocking or deleting data or suspending the processing, which for an AI feature can be worse than the fine.

## What the ANPD watches

The ANPD has used its powers on AI already. It has issued a preventive measure suspending Meta's use of Brazilian users' data to train generative AI until a compliance plan was accepted, and it has published technical notes on generative AI training and on specific generative AI products, including the view that generated content about an identifiable person can be personal data. Its published enforcement priorities include AI and emerging technologies alongside children's data. It also enforces the **ECA Digital** (Law 15.211/2025), which protects children and adolescents online and reaches AI products minors can use.

Other law applies too: the Consumer Defense Code, the Marco Civil da Internet, sector rules (such as the Central Bank's), and electoral rules that require labeling AI-generated campaign content and ban campaign deepfakes.

## What is not law yet: PL 2338/2023

PL 2338/2023 is the proposed AI legal framework. The text that came out of the Senate is risk-based, in the EU's mold:

- **excessive-risk** uses are prohibited; **high-risk** uses (listed in the bill) carry governance, documentation, testing and human oversight duties and an **algorithmic impact assessment**;
- a **preliminary risk assessment** by providers and deployers before use;
- rights for affected people: information, explanation, contestation and human participation in decisions;
- duties for general-purpose and generative AI, including remuneration and opt-out for copyrighted works used in training;
- a national system for AI regulation and governance (**SIA**) coordinated by the ANPD, with sector regulators;
- fines of up to R$50 million or 2% of revenue per infraction.

None of this binds anyone until both houses approve the bill (changes made by the second house send it back to the first) and the President signs it, followed by the transition period the final text sets. The Executive also sent a separate bill (PL 6.237/2025) to create the SIA structure, which Congress analyzes as well.

## Designing for Brazil now

Build for the LGPD today and the bill's direction tomorrow: declared purposes and bases, minimization, a review path for automated decisions with recorded criteria, impact reports for high-risk features, incident response and age-aware design. These cover most of what PL 2338 would add, so a final text means updating the regulatory map, not rebuilding the product.

PL 2338/2023 is **not law** while it is a bill; the LGPD already applies to personal data in AI systems.

## When to choose it

Read this lesson whenever an AI feature processes personal data of people in Brazil, whether or not you have a Brazilian entity. Treat the LGPD controls as launch requirements, and treat PL 2338 as a watch item in your regulatory map with a review date: check its status every quarter, and plan high-risk features (credit, hiring, biometrics, public services) as if an impact assessment and human review will be required.
