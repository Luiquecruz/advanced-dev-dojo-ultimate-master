1. Read the briefing and the complete files first: the risks in `BRIEFING`, the injected note in `INVOICES`, the tools `createSupportServer` exposes and how `main.ts` wires everything. The design decisions are already implied there.
2. Build retrieval and check it against the golden set before anything else: if the right document is not in the top hits, no agent or prompt will fix the answers.
3. Make the policy fail closed: deny over ask over allow, and deny anything no rule mentions. The model proposes; the policy decides.
4. Write the loop so every exit is explicit and measured: budgets checked before each call, refusals stop it, and the result says why it stopped, after how many steps and at what cost.
5. Put every tool call through the same gate in the same order (known tool and valid arguments, policy, human approval, execution), so a denied or rejected call never reaches the server.
6. Verify the answer mechanically (cited ids that retrieval actually returned) and feed failures back, instead of trusting the model to cite.
7. Evaluate the whole assistant, not its parts: run the golden set end to end, record why each case failed, and let a critical failure block the gate regardless of the average.
8. Write the threat model and governance map from the code, then let the tests prove they agree: the removed trifecta leg is denied, every tool has an owner and the approval the policy enforces, and the budgets and gate match what runs.
