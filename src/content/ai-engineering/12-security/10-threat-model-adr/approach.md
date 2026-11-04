1. Read the briefing as an attacker: who can write text the agent reads (anyone who emails), what is worth stealing or misusing (customer data, refunds, credentials), and which outputs leave the system (email, URL fetches, rendered images, logs).
2. Run the trifecta analysis on the tool table. Decide which leg to remove from what the business can live without, and remove every source of that leg, including the renderer.
3. Apply least privilege to what remains: approval where the briefing requires a human, and only the narrow credentials the remaining tools need.
4. Map each review concern to a threat, tag it with OWASP ids, and pick mitigations that remove or narrow the path first, gates second, detection last.
5. Check every mitigation you claim against the plan, so the document and the configuration cannot disagree.
6. Write down what remains and why it is acceptable, then set the red-team gate from the briefing so future releases prove the plan still holds.
7. Write the ADR from the plan: context with the forces, one "We will" decision, alternatives that someone will propose later, and the product cost in the negative consequences.
