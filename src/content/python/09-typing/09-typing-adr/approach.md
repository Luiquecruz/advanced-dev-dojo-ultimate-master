1. Compute the payload definition count from the inventory: the shapes of each service, minus the duplicates of the shared shapes.
2. List who implements each interface and who consumes each payload; that settles nominal versus structural and dict versus object.
3. Check each runtime requirement separately: what the registry must reject at call time, and what must be validated at the edge, given that annotations enforce nothing.
4. Read the baseline and the style guide to pick the generics syntax, and the CI requirement to pick a checker.
5. Write the ADR: the inventory, the arithmetic and the constraints in the context, a `We will` decision naming the interface and the payload type, rejected alternatives with the fact that ruled each out, and honest negative consequences (what `isinstance` against a protocol cannot see).
6. Re-read the coherence rules and check every plan value against them, including the number.
