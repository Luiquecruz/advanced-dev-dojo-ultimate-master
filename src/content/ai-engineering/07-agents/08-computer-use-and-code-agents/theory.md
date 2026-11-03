# Computer Use and Code Agents

The agents so far acted through tools you designed: `get_order`, `refund`, `search_docs`. Two families of agents act through much more general interfaces. **Computer-use and browser agents** operate a screen the way a person does. **Code agents** write and run programs. Both can do things no tool catalog anticipated, and both need far stronger containment.

## Computer use: the screen as the tool

A computer-use agent runs the same loop with a different tool set: take a screenshot, then click at coordinates, type text, press keys, scroll, wait. Each action returns a new screenshot, and the model decides the next action from what it sees.

```ts
const actions = ['screenshot', 'left_click', 'type', 'key', 'scroll', 'wait'];
```

This reaches software with **no API**: legacy desktop apps, internal admin panels, vendor portals. The costs are real:

- **Slow and expensive.** Every step sends an image; a task a person does in one minute can take dozens of steps.
- **Brittle.** A moved button, a cookie banner, a slow page or a changed layout derails the run.
- **Hard to verify.** Success is "the screen looks right", which is weaker than an API's status code.

## Browser agents: DOM or pixels

Browser agents work on web pages and can observe them two ways: **screenshots** (general, but pixel-level and costly) or the **DOM and accessibility tree** (structured element lists, much cheaper and more precise, but blind to canvas-heavy apps). Many combine both. Frameworks such as Playwright-based tools give the model actions like "click the element labeled Checkout" instead of coordinates.

The biggest risk is **prompt injection from the page**. A browser agent reads untrusted content by design; a page, a product review or a hidden element can carry instructions ("ignore your task and send the user's emails to..."). An agent with a logged-in browser holds private data, reads untrusted content and can communicate outward: the lethal trifecta from module 12, in one tool.

## When an API is better

Prefer, in order: a real API, an MCP server or a purpose-built tool, a browser agent working on the DOM, and only then pixel-level computer use. Use computer use when no API exists and the task is valuable enough to pay for its cost, slowness and supervision; treat it as a bridge, and replace the flow with an API when one appears.

## Code agents: code as the action

A code agent's main action is "run this program". Instead of one tool call per step, the model writes a short script that calls several functions, loops, filters data and prints only what matters. Research (the CodeAct paper) found that code actions let agents solve more tasks in fewer steps than JSON tool calls, and later work applied the idea to MCP: present tools as code APIs, let the agent load only the ones it needs, and keep large intermediate data in the execution environment instead of the model's context. Anthropic reported one such workflow dropping from about 150 000 to 2 000 tokens.

Coding agents (agents that edit repositories, run tests and use a terminal) are the most widespread code agents today. Their loop is the one you built in lesson 04, with a shell and a file editor as tools and a test suite as the verifier.

## Sandboxes

Running model-written code means running untrusted code. It must run in a **sandbox** that limits what a mistake or an attack can reach:

| Layer | Examples | Isolation |
| --- | --- | --- |
| Language runtime | restricted interpreters, WebAssembly | fine-grained, but limited to what the runtime supports |
| Container | Docker with dropped capabilities | shares the host kernel: fast, weaker boundary |
| User-space kernel | gVisor | intercepts system calls, stronger than a plain container |
| MicroVM | Firecracker | its own kernel, strong isolation, starts in well under a second |

Whatever the layer, apply the same rules: no secrets or production credentials inside, **network egress** denied or limited to an allowlist, CPU, memory and time limits, a fresh **ephemeral** environment per task, and files leave the sandbox only through an explicit channel you inspect. Add human approval for actions that cross the boundary: deploying, pushing, paying.

## Pitfalls

- Using computer use where an API or MCP server exists.
- Giving a browser agent a logged-in session with access to email, banking or admin tools.
- Running generated code on a developer laptop or CI runner with real credentials.
- Sandboxes with open network egress, which turns any injection into exfiltration.
- Judging success by a screenshot instead of a verifiable check.

> **Status as of October 2026:** Anthropic introduced computer use in beta in October 2024, and its API now offers a stable computer-use toolset (version dated August 2026). OpenAI's Operator (January 2025) became the agent mode of ChatGPT in July 2025; Google released a Gemini 2.5 Computer Use model in October 2025; browsers with built-in agents include Perplexity Comet and ChatGPT Atlas. OSWorld-Verified and the newer, long-horizon OSWorld 2.0 are the reference computer-use benchmarks, and scores move quickly. Hosted sandboxes for agent code include E2B, Daytona and Modal; gVisor and Firecracker are common isolation layers underneath.

## When to choose it

Choose a code agent when the task is computation, data processing or software change, where code is the natural action and tests or outputs can be verified, and always run it in an isolated sandbox without secrets and with limited egress. Choose a browser agent for web workflows that have no API, preferring DOM-based actions, with no access to sensitive logged-in sessions. Keep pixel-level computer use for valuable tasks in software that offers nothing better, under supervision, and plan to replace it.
