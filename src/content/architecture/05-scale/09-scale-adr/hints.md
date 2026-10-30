Read the briefing as the "signals" table of lesson 01: how many teams, what blocks the release, how many changes cross domains, whether any domain has its own lifecycle. Those four facts decide the topology.
---
Three teams, one React version, 85% of changes inside one domain and no independent lifecycle point to a single deploy with strong boundaries. The release train pain is a process problem: daily deploys and feature flags address it without distributed contracts.
---
Fill `plan.modules` with the four domains and the team that naturally owns each (one team owns two). Write `revisitWhen` as measurable signals that would justify moving right: more autonomous teams, a domain that must release on its own schedule, a domain that needs a different framework version.
---
Add a micro-frontends alternative and write its reason with the briefing numbers, for example "three teams" and "weekly release train". The decision sentence starts with "We will" and contains the topology in words, such as "modular monolith".
