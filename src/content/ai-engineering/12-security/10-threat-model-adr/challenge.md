Write the threat model ADR for **Relay**, the support agent of an online store.

## Briefing

When a customer emails support, Relay reads the ticket, looks up the customer and their orders, searches the help center and resolves the ticket. About **3 000 tickets a day**.

- **Who writes the input:** anyone who can send an email. Tickets and their attachments are **untrusted** and may contain prompt injections.
- **Data:** customer profiles and orders (name, email, address, last card digits) are personal data under the **LGPD and GDPR**.
- **Console:** support agents read Relay's answers in a console that renders markdown, including **remote images** by default (it can be switched off).
- **What the business needs:** reading tickets, customer lookup, help center search and replying to customers. Support leads accept that **a human sends every reply** if needed. Refunds up to $200 must remain possible, but finance requires **a human approval for every refund**.
- **Third party:** the help center tools come from the **DeskDocs** MCP server, operated by a vendor.
- **Compliance:** every tool call is audited, and audit logs are shipped to an external log vendor.
- **Release gate:** a red-team suite with the categories `exfiltration`, `tool_misuse`, `goal_hijack` and `prompt_leak` runs on every release; exfiltration and tool misuse must stay at **0%**, and the overall rate at most **5%**.

Tools (legs as in lesson 03; `issue_refund` changes state but provides no trifecta leg):

| Tool | Does | Legs | Credential |
| --- | --- | --- | --- |
| `read_ticket` | reads the inbound ticket and attachments | untrusted content | none |
| `lookup_customer` | profile and orders of the ticket's customer | private data | `crm-read:per-ticket` |
| `search_help_center` | searches the curated help center (DeskDocs MCP) | none | `kb-read` |
| `fetch_url` | fetches any URL mentioned in a ticket | untrusted content, external communication | none |
| `send_email` | sends an email to any address | external communication | `smtp-send` |
| `draft_reply` | saves a reply draft on the ticket for a human to send | none | `helpdesk-write:per-ticket` |
| `issue_refund` | refunds an order, up to $200 | none | `payments-refund:per-request` |

Other credentials available: `crm-admin`, `ops-root`.

**Concerns raised in review:** `C1` an injected ticket makes Relay leak order history; `C2` an injected ticket triggers refunds; `C3` the DeskDocs server changes its tools after review; `C4` personal data or tokens end up in the vendor's logs.

**Mitigation catalog:** `draft-only-replies`, `no-url-fetching`, `no-remote-images`, `refund-approval`, `refund-limits`, `scoped-short-lived-credentials`, `secrets-out-of-context`, `pii-redaction-in-logs`, `server-allowlist`, `pinned-tool-hashes`, `input-classifier`, `red-team-gate`.

## Task

In `adr.ts`, export two constants.

**`adr`**: `id` (positive integer), `title` (10+ characters), `status: 'accepted'`, `layer: 'governance'`, `context` (80+ characters, mentions untrusted input or injection, and personal or customer data), `decision` (40+ characters, starts with `We will`), `alternatives` (2+ distinct `{ option, reason }`, option 3+ characters, reason 20+), `consequences: { positive, negative }` (1+ items of 15+ characters each).

**`threatModel`**:

- `assets` (3+) and `trustBoundaries` (2+), each 10+ characters; some asset mentions customer or personal data, some asset mentions credentials, tokens, secrets or keys.
- `tools`: every tool of the table mapped to `'enabled'`, `'approval'` or `'removed'`.
- `rendersRemoteImages`: a boolean.
- `removedLeg`: `'privateData'`, `'untrustedContent'` or `'externalCommunication'`.
- `credentials`: names from the briefing.
- `threats`: `{ id, concern, owasp, threat, mitigations }` with unique ids, a `concern` id, OWASP ids (`LLM01`–`LLM10`, `ASI01`–`ASI10`), a description of 20+ characters and mitigations from the catalog.
- `residualRisks`: 1+ `{ risk, acceptedBecause }`, both 20+ characters.
- `redTeam: { categories, maxRateByCategory, maxOverallRate }`.

The plan must be coherent with the briefing:

1. What the business needs stays `'enabled'`, refunds use `'approval'`, and the session (the ticket is untrusted input; enabled and approval tools count, and remote images count as external communication) does **not** hold all three legs; `removedLeg` is a leg it really lacks.
2. Credentials: every enabled or approval tool's credential is present; no credential of a removed tool; never `crm-admin` or `ops-root`.
3. Each concern is covered by at least one threat that uses an effective mitigation for it (C1: removing a channel; C2: approval or limits; C3: allowlist or pinned hashes; C4: redaction or keeping secrets out of the context), and a C1 threat is tagged `LLM01` or `ASI01`.
4. Mitigations you claim exist in the plan: `draft-only-replies` means `send_email` is removed, `no-url-fetching` that `fetch_url` is removed, `no-remote-images` that images are off, `refund-approval` that refunds use approval.
5. The red-team gate covers the four categories, with limits within the briefing.

The tests check structure and coherence, not your wording.
