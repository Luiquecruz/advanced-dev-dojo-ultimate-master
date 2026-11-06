# Spec-Driven Development

A coding agent given a one-line prompt fills every gap with a guess. Some guesses are fine; others become a feature nobody asked for, a missed edge case, or a security rule that was never written down. **Spec-driven development (SDD)** moves the important decisions out of the chat and into a written **specification** that both the humans and the agents work from.

## The flow

Most SDD tools share the same pipeline, with a human review gate between steps:

1. **Specify:** what the feature must do and why, as numbered requirements with acceptance criteria. No technology choices yet.
2. **Plan:** the technical design: architecture, data model, interfaces, the constraints from your context files (lesson 04).
3. **Tasks:** small, ordered units of work, each pointing back to the requirements it implements.
4. **Implement:** the agent works task by task; tests prove each requirement.

The spec is reviewed when it is cheap to change: correcting "the link expires after 30 minutes" in a spec costs a sentence, while correcting it after an agent built the token store, the email template and the tests costs a review cycle.

```markdown
## Requirements
- REQ-1: A user can request a reset link with their email address.
- REQ-2: A reset link expires 30 minutes after it is issued.

## Tasks
- [x] TASK-1: Add the reset request endpoint (REQ-1)
- [ ] TASK-2: Store reset tokens with an expiry (REQ-2)
```

Requirement notations help here. **EARS** (Easy Approach to Requirements Syntax, from Rolls-Royce) uses templates such as "*When* a reset link is older than 30 minutes, *the system shall* reject it", which makes each requirement testable on its own.

## Traceability: the part that keeps it honest

A spec is only useful if you can tell which parts are built and proven. Systems engineering has used a **requirements traceability matrix** for decades: one row per requirement, the tasks that implement it, the tests that verify it. With agents the matrix becomes a mechanical check you can run on every change:

- a requirement with no task is **unplanned**; with tasks but no test it is **untested**;
- a task that implements no requirement is an **orphan**: scope creep, or a requirement nobody wrote down;
- a test that traces to no requirement checks behavior the spec does not ask for;
- a reference to an id that no longer exists means the spec and the work have **drifted**.

The challenge builds that matrix from plain Markdown and test names, and checks a model-generated plan against it. Ids in test names (`REQ-2: rejects an expired link`) are a cheap convention that makes the link machine-readable.

## Three levels

Birgitta Böckeler's comparison of SDD tools (on martinfowler.com) separates three levels of commitment:

- **Spec-first:** a spec is written before the work and guides it, then discarded. Most tools live here.
- **Spec-anchored:** the spec is kept and updated as the feature evolves, so it stays the reference for later changes.
- **Spec-as-source:** humans edit only the spec; code is regenerated from it and never edited by hand.

Each level asks for more discipline and promises more. Spec-as-source inherits the non-determinism of models (lesson Prompts as Code): the same spec regenerated twice yields different code, so tests carry the guarantees, not the spec text.

## Pitfalls

- **Ceremony for small changes.** A bug fix does not need four user stories and sixteen acceptance criteria. Scale the process to the risk (lesson 05).
- **Verbose specs nobody reviews.** Generated Markdown is as easy to rubber-stamp as generated code. A spec you did not read is vibe coding with extra files.
- **Drift.** A spec that is not checked against tasks and tests rots like any comment. Make the matrix part of CI, or at least of the review.
- **Specs that dictate implementation.** Requirements say *what*; the plan says *how*. Mixing them freezes design decisions before anyone has thought about them.

Spec-driven development is `emerging`: the tools change often and the levels above are more stable than any of them.

## When to choose it

Write a spec when a change spans several sessions or agents, touches security or money, or will be reviewed by people who do not read the code; keep it anchored when the feature will live for years. For a small fix, a clear prompt, a failing test and a review are enough. In every case, keep requirement ids in tasks and test names so the matrix can tell you what is planned, what is proven and what drifted.
