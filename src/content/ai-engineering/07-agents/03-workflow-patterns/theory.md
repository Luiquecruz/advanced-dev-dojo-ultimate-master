# Workflow Patterns

A workflow is a set of model calls whose order your code decides. A handful of shapes cover most of them. They are worth knowing by name because they are the vocabulary of design reviews ("this is routing plus a chain") and because each one fixes a specific weakness of a single big prompt.

## Prompt chaining

Split a task into fixed steps, each call working on the previous output: outline, then write, then translate. Each prompt is smaller and easier to get right, and you can put a **gate** between steps: a mechanical check that stops the chain when a step went wrong.

```ts
for (const step of steps) {
  const response = await model.generate({ messages: [{ role: 'user', content: step.prompt(previous) }] });
  if (response.finishReason !== 'stop' || !step.gate(response.text)) throw new GateError(step.name, response.text);
  previous = response.text;
}
```

A truncated or refused reply is a failed step too. Without the gate, a broken outline flows into the next prompt and the final output looks plausible but is built on garbage.

**Use it when** the task decomposes cleanly into stages known in advance. You trade latency (calls in sequence) for accuracy per step.

## Routing

Classify the input, then send it to a specialized follow-up: a billing prompt, a technical prompt, a cheap model for easy questions and a strong one for hard ones. Each specialist prompt can be tuned without hurting the others.

The classification is a structured output with a **closed set** of answers. Your code lists the routes, parses the reply, and treats anything outside the set (an unknown name, malformed JSON, a refusal) as "unknown", which goes to a fallback route. A router that crashes on an unexpected answer, or forwards an invented route name, is the most common bug in this pattern.

**Use it when** inputs fall into distinct categories that are better handled separately, and the classification is reliable (measure it like any classifier).

## Parallelization

Run independent calls at the same time and aggregate in code. Two flavors:

- **Sectioning:** different subtasks of one input in parallel: summary, risks and deadlines of one contract; or a guardrail check running next to the main answer instead of before it.
- **Voting:** the same question several times, then aggregate: majority vote over a classification, or "flag if any voter flags" for a safety check. Sampling several answers and taking the most common one (*self-consistency*) improves accuracy on reasoning tasks.

```ts
const ballots = await Promise.allSettled(Array.from({ length: 5 }, () => model.generate(request)));
```

`Promise.allSettled` matters: one voter failing with a `503` should become an abstention, not fail the whole vote. Decide the tie rule up front; returning "undecided" and escalating is usually better than guessing.

**Use it when** subtasks are independent (sectioning) or when one answer is not trustworthy enough and extra calls are cheaper than a mistake (voting). Latency stays close to one call; cost multiplies.

## Evaluator-optimizer

One call writes, another evaluates against explicit criteria and returns feedback; the writer revises with that feedback; repeat. The evaluator's answer is structured (`{ pass, feedback }`), so code decides whether to continue.

Two rules keep it honest:

- **Bound the rounds.** Without a limit, a picky evaluator and a stubborn writer loop forever. Two to four rounds capture most of the gain.
- **Report acceptance.** After the last round, return the draft *and* whether it passed, so the caller can escalate an unaccepted draft instead of shipping it silently.

**Use it when** there are clear evaluation criteria and revision measurably helps: translations with terminology rules, code that must pass checks, text with a style guide. If you cannot write the criteria down, the evaluator is guessing too.

## Orchestrator-workers

A sixth pattern sits between workflows and agents: an orchestrator model splits a task into subtasks it decides at runtime, workers handle them, and the orchestrator synthesizes. Because the subtasks are not known in advance, it is covered with multi-agent systems in module 09.

## Combining patterns

Real features compose them: route a ticket, run a chain for the billing route, use sectioning for a long document, gate the final answer with a vote. Each piece stays a function you can unit test with a scripted model, which is the main advantage over an agent.

## Pitfalls

- Chains without gates, so errors propagate silently.
- Routers that trust the classifier's answer without checking it against the route list.
- `Promise.all` for voting, so one failed voter fails everything.
- Evaluator loops with no round limit or no "not accepted" outcome.
- Using a pattern because it exists: if one call with good context works, stop there.

These names are used by most agent frameworks and their guides. Self-consistency (voting) and Self-Refine (evaluator-optimizer) are the research papers behind two of them.

## When to choose it

Use a chain when the stages are fixed, routing when inputs fall into distinct categories, sectioning when subtasks are independent, voting when a wrong answer costs more than extra calls, and an evaluator-optimizer when you can state the criteria a draft must meet. If the steps themselves depend on what the model discovers, none of these fit; that is when the agent loop of the next lesson earns its cost.
