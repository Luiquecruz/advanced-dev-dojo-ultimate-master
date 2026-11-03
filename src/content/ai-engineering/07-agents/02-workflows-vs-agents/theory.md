# Workflows vs Agents

"Agent" is the most overloaded word in AI engineering. Vendors call a chatbot with one tool an agent; researchers mean a system that plans and acts for hours. For design decisions you need a sharper line, and the most useful one is about **who decides the next step**.

## The distinction

Anthropic's "Building effective agents" names both kinds of *agentic systems*:

- **Workflows** are systems where models and tools are orchestrated through **predefined code paths**. Your code decides the order: first extract, then check, then draft. The model fills in each step.
- **Agents** are systems where the model **dynamically directs its own process and tool use**. Your code runs a loop; the model decides which tool to call next, how many times, and when it is done.

```ts
const facts = await extract(ticket);
const draft = await reply(ticket, facts);
const reviewed = await review(draft);
```

```ts
while (true) {
  const response = await model.generate({ messages, tools });
  if (response.toolCalls.length === 0) return response.text;
  messages.push(...(await runTools(response.toolCalls)));
}
```

The first is a workflow: three calls, always in this order, each testable on its own. The second is an agent: the number of calls is unknown until it finishes.

## It is a spectrum

| Shape | Who picks the next step | Typical use |
| --- | --- | --- |
| Single call (with retrieval or examples) | nobody, there is one step | classification, extraction, a reply |
| Workflow | your code | a pipeline with known stages |
| Workflow with a model-made choice | your code, with one routing decision by the model | send each ticket to the right specialist prompt |
| Agent | the model, inside your limits | open-ended tasks with an unknown number of steps |

Moving down the table buys flexibility and costs predictability. The recommendation that ends most design reviews: **find the simplest solution that works, and add complexity only when it measurably improves the result.** For many applications, one well-built call with good context is enough.

## What autonomy costs

An agent trades latency and cost for the ability to handle tasks you cannot script.

- **Cost and latency grow with steps.** Each step resends the whole growing conversation, so a 15-step run can cost far more than 15 single calls.
- **Errors compound.** If each step is right 95% of the time and steps fail independently, a 10-step run is fully right only about 60% of the time (`0.95^10`). Workflows contain errors at stage boundaries where code can check them; agents carry them forward.
- **Testing gets harder.** A workflow has a fixed path you can unit test stage by stage. An agent's path changes between runs, so you test properties of its trajectory (module 10): did it use the right tools, stay within budget, avoid forbidden calls.
- **Risk grows with tools.** An agent can call any tool you give it in any order, including ones you did not expect for this task.

## When a fixed workflow beats an agent

Choose a workflow when:

- the steps are **known in advance** and the same for most inputs (extract, validate, draft, review);
- each stage has a **mechanical check** you can put between steps (does it parse, is the category known);
- **latency or cost** must be predictable (a user-facing request with a strict p95);
- the process must be **auditable**: regulators or reviewers need to see the same path every time.

Choose an agent when:

- the number of steps **cannot be predicted** (debugging a failing test, researching an open question, resolving a ticket that may need two or twelve lookups);
- the environment gives **feedback** after each action (tool results, test output) that the model can use to decide the next move;
- you can **bound** the loop (budgets, stop rules) and **verify** the outcome.

Hybrids are common and often best: a workflow whose one hard stage is an agent, or an agent whose risky actions go through fixed approval steps.

## Pitfalls

- **Over-agentification:** an agent where a three-step workflow would do, paying for unpredictability with no gain.
- Choosing a framework before understanding the loop it runs; start with plain calls, adopt a framework where it earns its abstraction.
- Calling a system an agent to sell it; describe what decides the next step instead.
- An agent with no budget, no verifier and no stop rule other than "the model says it is done".

> **Status as of October 2026:** Anthropic's "Building effective agents" (December 2024) defined the workflow patterns (prompt chaining, routing, parallelization, orchestrator-workers, evaluator-optimizer) that most frameworks now name. Frameworks that support both shapes include LangGraph (graphs with explicit edges or a prebuilt agent), the OpenAI Agents SDK, the Claude Agent SDK, Mastra, Pydantic AI and Google ADK. "Agentic" in product marketing rarely tells you which of the two you are buying.

## When to choose it

Start every design with the question "can my code decide the next step?". If yes, build a workflow: it is cheaper, faster, easier to test and to audit. Use an agent for the part of the task whose steps depend on what the model discovers along the way, give it a budget and a verifier, and keep the rest as code.
