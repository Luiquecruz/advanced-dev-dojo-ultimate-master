## Why decisions get lost

Six months after choosing TanStack Query over a global store, a new developer asks "why don't we just put everything in Redux?". Nobody remembers the reasons, the person who decided left, and the discussion lives in a Slack thread nobody can find. The team either repeats the debate or, worse, reverses a good decision by accident.

An **Architecture Decision Record (ADR)** is a short document that captures one significant decision: the forces at play, what was decided and what it costs. Michael Nygard proposed the format in 2011 ("Documenting Architecture Decisions"), and it is now standard practice in teams of every size.

## The Nygard format

One decision per file, numbered, written in plain Markdown:

```
# 7. Use TanStack Query for server state

## Status

Accepted

## Context

Product lists, user profiles and orders come from REST endpoints. Today they are
copied into a global store with useEffect, which causes stale data and duplicated
loading flags on five screens.

## Decision

Server data is fetched and cached with TanStack Query, one query key factory per
feature. The global store keeps only client state (cart, preferences).

## Consequences

Caching, deduplication and refetching come for free. The team must learn query
keys and invalidation. Server data no longer appears in the store devtools.
```

- **Title**: a short imperative phrase with a sequence number. Numbers are never reused.
- **Status**: where the decision is in its lifecycle.
- **Context**: the forces, constraints and quality attributes that matter, written neutrally.
- **Decision**: what we will do, in active voice ("We will...").
- **Consequences**: everything that follows, **good and bad**. An ADR with only benefits is a sales pitch.

Alternatives such as MADR add "Considered options" and "Pros and cons" sections. Pick one template and keep it.

## Lightweight and in the repository

ADRs live **next to the code** (`docs/adr/0007-use-tanstack-query-for-server-state.md`), are reviewed in pull requests and versioned with the code they describe. A good ADR fits on one screen and takes under an hour to write. If it needs a meeting to understand, it is a design document, not an ADR.

Write one when a decision is architecturally significant: it affects structure, quality attributes, dependencies or interfaces, and reversing it would need a migration. "We name hooks `useSomething`" is a lint rule, not an ADR.

## The status lifecycle

```
proposed ──accept──▶ accepted ──supersede──▶ superseded
```

- **Proposed**: open for discussion in a pull request.
- **Accepted**: the team agreed; the code follows it.
- **Superseded**: a newer ADR replaced it. The old record says "Superseded by ADR 12" and the new one references the old.

Some teams also use *rejected* and *deprecated*; the principle is the same.

## Accepted ADRs are immutable

Once accepted, an ADR is a **historical record**. You do not edit the decision when circumstances change: you write a new ADR that supersedes it, and the only change to the old file is its status. This keeps the reasoning that was valid at the time, which is exactly what future readers need.

In code, that rule maps directly onto immutable updates: a function that supersedes a record returns a **new log** instead of mutating the existing one, and transitions that break the lifecycle (accepting a superseded record, superseding a proposal) are rejected.

```jsx
const accepted = accept(proposal);
console.log(proposal.status, accepted.status);
```

## Pitfalls

- Writing ADRs after the fact to justify a choice already made, without real alternatives.
- Editing accepted ADRs, which destroys the history.
- Recording trivial choices until nobody reads the folder.
- Leaving out the negative consequences.

## When to choose it

Write an ADR whenever a decision touches one of the four layers (rendering, organization, state and data, scale) or a ranked quality attribute, and whenever you notice the team re-debating a past choice. Keep them short, in the repository, and supersede instead of editing. For small teams, a handful of ADRs per year is normal and healthy.
