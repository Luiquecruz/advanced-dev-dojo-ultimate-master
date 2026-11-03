1. Decide what may reach the model before calling it: only passages above the evidence threshold, strongest first, capped. When nothing passes, the honest answer needs no model at all.
2. Number the sources. Small numbers are easy to cite and easy to validate, and the mapping back to ids and documents stays in your code.
3. Put the rules in the system message (answer from the sources, cite every claim, never invent a number) and the context plus question in the user message.
4. Treat citations as untrusted output. Parse every marker, then check three things: the reply finished normally, it cites something, and everything it cites was provided in this request.
5. Repair once with specific feedback: keep the conversation, add the rejected reply and name the valid numbers. A bounded retry fixes most slips without risking a costly loop.
6. When the repair also fails, withhold the answer. A missing answer with sources is better than a confident unsupported one, and the status tells the UI which message to show.
