# Checkpoint: the Threat Model ADR

This module assumed the model will be fooled and built controls that hold anyway: removing a trifecta leg, sanitizing output, narrowing credentials, gating third-party tools, guarding inputs and outputs, and measuring it all with an adversarial suite. The checkpoint turns that into a **threat model**, written as an ADR plus a structured plan, for a support agent with real tools. It is the document a security reviewer asks for before launch, and the one you update every time the agent gains a capability.

## What a threat model contains

| Part | Question | For an agent |
| --- | --- | --- |
| **Assets** | What would hurt to lose, leak or misuse? | customer data, credentials, money movements, the integrity of what the agent says or sends |
| **Trust boundaries** | Where does data cross from less to more trusted? | inbound content into the context, tool calls into internal APIs, third-party servers into the context, output into a browser, logs out to a vendor |
| **Entry points** | Where can an attacker put text or code? | tickets, emails, web pages, documents, tool descriptions, memories |
| **Threats** | What can go wrong at each boundary? | exfiltration, tool misuse, poisoning, privilege abuse; tagged with OWASP ids |
| **Mitigations** | What stops or limits each threat, and is it built? | each control traced to the plan that implements it |
| **Residual risk** | What remains, and who accepted it? | stated plainly, with the reason it is acceptable |

Classic methods still help. **STRIDE** (spoofing, tampering, repudiation, information disclosure, denial of service, elevation of privilege) is a good prompt per boundary; the OWASP lists (lesson 09) add AI-specific entries. For agents, start with the **trifecta analysis** (lesson 03): it tells you whether one injection can turn into a breach, which decides most of the rest.

## From threats to decisions

A useful threat model is traceable in both directions:

- **Every concern has an effective mitigation.** "An injected ticket could leak order history" is answered by a control that removes the path (no external channel), not only by one that lowers its probability (a classifier).
- **Every mitigation exists in the plan.** Writing "draft-only replies" while `send_email` is still enabled is the most common lie in threat models. Tie each mitigation to a configuration fact a test or reviewer can check.
- **Every accepted risk has a reason and a monitor.** "A human may send a biased draft unchanged" is acceptable because a human reads it and the red-team suite tracks goal hijack; write both down.

Prefer controls in this order: remove the capability, narrow it (scope, time, allowlist), gate it (approval), detect it (classifiers, monitoring). Each step down is weaker and needs the steps above it.

## Example: an internal HR policy assistant

```ts
export const threatModel = {
  assets: ['Employee records (personal data)', 'HR system credentials', 'Accuracy of policy answers'],
  trustBoundaries: ['Uploaded documents to the agent context', 'Agent tool calls to the HR API'],
  tools: { search_policies: 'enabled', read_employee: 'enabled', post_to_slack: 'removed' },
  rendersRemoteImages: false,
  removedLeg: 'externalCommunication',
  threats: [
    { id: 'T1', owasp: ['LLM01', 'ASI01'], threat: 'An uploaded document leaks salaries through a link or post', mitigations: ['no-remote-images', 'no-external-posting'] },
  ],
  residualRisks: [{ risk: 'A poisoned document can still mislead an answer', acceptedBecause: 'answers cite sources and HR reviews disputed ones' }],
};
```

The mitigations name things you can see in the plan (`post_to_slack: 'removed'`, `rendersRemoteImages: false`), and the residual risk says what the controls do not cover.

## Writing the ADR well

- **Context** names the attacker's position (who can write the content the agent reads), the assets, the tools, the renderer and the regulatory constraints. A reader should see the trifecta before you name it.
- **Decision** says which leg you remove and the main controls, in one "We will" sentence.
- **Alternatives** are the options someone will propose later: "keep sending, with approval", "add a classifier", "remove the data instead". Each with the reason it loses.
- **Consequences** include the product cost: a human in the reply loop, slower resolution, features that disappear. Security decisions that hide their cost get reversed quietly.

## Pitfalls

- Counting human approval as removing a leg.
- A classifier as the only answer to injection.
- Mitigations that do not exist in the configuration.
- Admin or broad credentials "for convenience".
- No residual risk, which usually means nobody looked.

> **Status as of October 2026:** threat modeling for agents is converging on the trifecta or the Agents Rule of Two for data flows, OWASP's LLM and agentic Top 10s for coverage, and adversarial eval suites for evidence. Regulators and auditors increasingly expect a documented risk assessment for AI features that process personal data (module 13 covers the EU AI Act and Brazil's LGPD).

## When to choose it

Write the threat model before an agent first reads untrusted content or gains a tool that writes, sends or spends, and update it whenever a tool, data source, renderer or third-party server changes. Keep the plan in code next to the agent's configuration, so a test fails when the two drift apart.
