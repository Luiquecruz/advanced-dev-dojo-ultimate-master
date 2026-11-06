# Capstone: A Governed Support Copilot

Every module of the track ended with a decision; the capstone puts them in one system. The product is the **Ledgerly Support Copilot**: an internal assistant that answers billing questions for 40 support agents, looks up invoices and prepares refunds. The briefing (in `briefing.ts`) fixes the constraints: personal and financial data, customer-written notes that are untrusted, refunds that move money, about 3 000 questions a day, 10 seconds and 5 US cents per question, GDPR and LGPD.

## Six layers, one design

| Layer | Decision in this capstone | Where you learned it |
| --- | --- | --- |
| Model | one pinned model id, cost per call counted against a budget | Models for Engineers |
| Context | retrieval over help documents, cited by id; a system prompt that treats customer text as data | Retrieval and RAG; Prompt and Context Engineering |
| Harness | tools exposed by an MCP server (`2026-07-28` style), an allow/ask/deny policy, human approval, a citation verifier | Tools and Protocols; Harness and Loop Engineering |
| Loop | one agent with step and cost budgets and a stop on refusal | Agents and Workflows |
| Evaluation | a golden set with required sources and facts, a pass-rate threshold and critical cases | Evaluation and Observability |
| Governance | a threat model and a governance map that must agree with the code | Security; Governance in Layers |

Notice what is **not** here: no multi-agent system, no fine-tuning, no graph memory. The evaluation criteria of the capstone reward the simplest design that meets the evals: a workflow before an agent, one agent before several, retrieval before adaptation. A single agent with four tools is enough for this briefing; every component you add must buy a measured improvement.

## Security by architecture

The copilot holds all three legs of the lethal trifecta (Security module): **private data** (invoices), **untrusted content** (the note a customer writes on an invoice) and an **exfiltration channel** (the `send_email` tool the MCP server happens to expose). One of the seed invoices carries an injected instruction to email every invoice to an outside address. No prompt reliably stops a model from following it, so the design removes a leg: the policy denies every `send_*` tool before the call reaches the server, whatever the model asks. Refunds are handled the same way: the policy asks a human for every refund and denies amounts above the finance limit, so the worst a hijacked model can do is propose a refund a team lead rejects.

The threat model you write lists which tools sit behind each leg and which leg is removed, and a test checks the claim against the policy. A threat model that the code contradicts is policy theater.

## Evidence instead of impressions

The loop stops for four reasons (answered, refused, out of steps, out of budget) and reports which one, with steps and cost. The verifier rejects an answer that cites nothing or cites a document retrieval never returned, and feeds the reason back to the model. The eval suite runs the golden set through the whole assistant, counts errors as failures instead of crashing, and blocks the release when the pass rate is below the threshold or a critical case fails, however good the average looks. The governance map pins the model, names an owner for every tool and repeats the budgets and the gate; tests check that it matches the running code, so it cannot drift silently.

## What you leave out on purpose

Part of the deliverable is saying what you chose not to build and why: tracing (module 10) would be the next addition for production, memory is unnecessary because each question stands alone, and permission-aware retrieval becomes necessary the day internal documents differ by team. Write these down in the ADRs you built in earlier modules; the capstone is where they meet.

Product names and versions change; the mechanisms in this capstone do not.

## When to choose it

Use this shape (retrieval, a few tools behind a policy, one budgeted agent with a verifier, a gated eval suite, and governance documents checked by tests) for any internal assistant that reads sensitive data and can act. Start smaller when the assistant cannot act (a RAG workflow without an agent loop is enough), and grow it only when your evals show a gap that a new component closes.
