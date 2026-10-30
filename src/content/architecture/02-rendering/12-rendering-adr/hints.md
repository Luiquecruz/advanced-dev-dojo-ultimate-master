Start with the `routes` map, not the prose. For each row of the briefing, run the four questions in order: SEO, same HTML for everyone, how fresh, how often requested. The rules in the challenge already remove most models per route.
---
Two routes are private and per user, three are public and SEO-critical. Of the public ones, two only change on deploy (prebuild them) and one changes several times an hour (it needs a model that refreshes shared HTML without a full rebuild).
---
Write the ADR from the map: the context repeats the forces (60% from search, prices change hourly, tight render budget, 50× spikes), the decision is one "We will..." sentence grouping routes by model, and each rejected alternative ("SSR everywhere", "SPA everywhere", "rebuild on every change") cites one of those forces.
---
For negative consequences think about what ISR and a client app cost you: a stale window that checkout must compensate for, the first visitor after expiry, and two delivery modes to test.
