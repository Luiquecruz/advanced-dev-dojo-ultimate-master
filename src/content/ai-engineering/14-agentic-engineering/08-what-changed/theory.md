# What Changed

This track separates a **stable core** (retrieval, evals, loops, injection, governance layers) from a **volatile edge** (protocol revisions, tools, laws, vendor features). The core is taught in the body of each lesson as mechanisms that stay true. The edge cannot be taught as fact, because it moves faster than any course. This lesson is about the second half: how an engineer keeps the edge current without rereading everything.

## What belongs to the edge

Anything with a version, a vendor, a number or a legal deadline attached:

- **Protocols and specifications:** MCP revisions, A2A, Agent Skills, `AGENTS.md`.
- **Model facts:** model families, snapshots, context sizes, prices, rate limits.
- **Tools and frameworks:** coding agents, SDKs, evaluation runners, spec-driven workflows.
- **Rules:** the OWASP lists, the EU AI Act and its application schedule, LGPD and PL 2338, state laws in the United States.
- **Research:** productivity studies, benchmark results, attack and defense papers.

## How to keep a record of the edge

A useful record has a few properties, whatever tool holds it:

- **One line per change.** What changed, which part of your system it touches and what to do about it. A change earns a line only if it alters what an engineer should do or know, not because it was announced loudly.
- **The event's own date.** A specification's publication or a law's entry into force, not the day it was reported.
- **Nothing is deleted.** Superseded entries stay, so the record doubles as a short history of why the system looks the way it does.
- **A fixed review cadence.** Quarterly is a reasonable default: check each item against its primary source (the specification, the official announcement, the legal text), not against commentary.

## What did not change

The edge moves constantly; the core does not. Prompt injection is not solved by prompting, so security still comes from architecture. Evals still beat impressions. Workflows still come before agents and one agent before many. Budgets, verifiers and stop rules still bound every loop. Most changes in this field alter a name, a version, a date or a default, and none of them changes those rules. That is why the track keeps the two apart: the core decides how you build, and the edge decides which parts you currently build with.

Dates of regulatory application can be amended after they are published, so confirm them against the official text before a compliance decision.

## Dependencies of your own system

The same practice applies to the AI system you run in production. Keep a record of what it depends on: model snapshots and their retirement schedules, protocol revisions, SDK versions, prompts, policies and thresholds. Review it on the same cadence and turn each retirement or breaking change into planned work before it becomes an incident. Pin versions where you can, and treat an alias that silently moves to a newer model as a change you did not approve.

## When to choose it

Return to this lesson whenever you come back to the track, and before you rely on any fact in a lesson that names a vendor, version or deadline: check it against the primary source. When you maintain your own AI systems, keep a record of your dependencies and review it on a fixed cadence. Most production surprises in this field are a change nobody wrote down.
