# Vibe Coding vs Agentic Engineering

Two people can use the same coding agent, on the same model, and produce very different software. The difference is not the tool; it is what they do around it. This lesson names the two ends of that spectrum and the practices that separate them.

## Vibe coding

In February 2025, Andrej Karpathy described "a new kind of coding I call vibe coding, where you fully give in to the vibes, embrace exponentials, and forget that the code even exists." You describe what you want, accept whatever the model writes, paste error messages back until it runs, and never read the diff. He presented it as a way to build throwaway weekend projects, and for that it is genuinely useful: a prototype to test an idea, a one-off script, a personal tool nobody else depends on.

The term spread far beyond that scope, and so did the practice. Simon Willison pointed out a month later that **not all AI-assisted programming is vibe coding**: if you review, test and understand the code the model wrote, you are doing software development with an assistant. The definition hinges on one thing: whether anyone is accountable for the code.

Vibe coding fails in predictable ways once software has users:

- **Security holes nobody looked for:** missing authorization checks, secrets in client code, databases open to the internet.
- **Destructive actions:** an agent with broad permissions deleting data it was told not to touch.
- **AI slop:** large amounts of plausible, low-quality code (and text) that nobody can maintain.
- **Comprehension debt:** a codebase the team no longer understands, so every change gets slower and riskier (lesson 05).

## Agentic engineering

The disciplined end of the spectrum got a name in two steps. In October 2025 Willison proposed "vibe engineering" for experienced developers who use agents to go faster while staying accountable for what they ship. In February 2026 Karpathy suggested **agentic engineering**: "agentic" because most of the code is now written by agents you orchestrate and oversee, "engineering" because doing that well is a skill with its own depth. Willison adopted the term, and it is the one this track uses.

Agentic engineering keeps the speed of agents and adds the controls of engineering:

| Practice | Why it matters with agents |
| --- | --- |
| **Tests first or alongside** | An agent can iterate safely only against an automated check. Tests are the main differentiator: they turn "looks right" into "is right" for every change. |
| **Specs and plans** | Decisions are made and reviewed before code exists (lesson 03). |
| **Context files and skills** | The agent works with your conventions instead of guessing them (lesson 04). |
| **Small, verifiable steps** | Each change is small enough to review and to revert (lesson 05). |
| **Review proportional to risk** | Authentication, payments and data migrations get line-by-line review; a CSS tweak does not. |
| **Harness controls** | Permissions, sandboxes and approval gates limit what the agent can break (module 08). |
| **Version control hygiene** | Small commits and branches make agent mistakes cheap to undo. |
| **Measurement** | Delivery and quality metrics, not impressions, tell you whether it helps (lesson 07). |

None of these practices is new. What changed is their return: with agents, the team that has fast tests, clear specs and good review gets far more out of the same model than the team that does not. The 2025 DORA report describes AI as an **amplifier** of existing engineering strengths and weaknesses (lesson 07).

## The spectrum, not a binary

Most work sits between the extremes, and the right position depends on the stakes. A spike to evaluate a library can be vibe coded and thrown away; the moment it becomes something others rely on, it needs tests, review and an owner. A useful rule: **you may vibe code what you are willing to delete**. Everything you ship, you must be able to explain.

> **Status as of October 2026:** Karpathy's "vibe coding" post dates from 2 February 2025; Collins English Dictionary named "vibe coding" its Word of the Year 2025. Simon Willison proposed "vibe engineering" on 7 October 2025 and, after Karpathy suggested "agentic engineering" in February 2026, started an Agentic Engineering Patterns guide. Widely reported incidents include an AI agent on Replit deleting a production database during a code freeze (July 2025) and a scan finding that 170 of 1 645 apps built with Lovable exposed personal data (May 2025). The terms are `emerging`; their definitions still vary between authors.

## When to choose it

Vibe code only what is disposable and private: prototypes, experiments, personal scripts, with no production data and no credentials in reach. For anything that will be deployed, maintained or used by others, practice agentic engineering: tests as the agent's feedback, specs and context for its input, permissions around it, and a human who reads, understands and owns the result.
