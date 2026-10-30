Fill the `stateMap` first by asking, for each row, "who owns the truth?" Two pieces come from `GET` endpoints, so the client only caches them.
---
Then ask "must it survive a reload or a shared link?" (two pieces), "can it be computed?" (one piece) and "is it a process with guarded steps?" (one piece). What is left is a draft, a panel toggle and one piece read on two different routes.
---
Only one piece deserves the client store: the cart, which the client owns and two distant parts of the app read. The filter panel toggle is read by one page, so it is local; the address draft is a form.
---
For the ADR, the context names the three incidents (stale lists, broken shared links, the double charge) and separates server state from client state. Reject "one global store for everything" and "local state only" with those incidents, and list the extra libraries and the migration as negative consequences.
