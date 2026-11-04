1. List the five concerns. For each requirement in the briefing (dashboard, cache, tokens, quota), write which concern must sit outside which, then derive the one order that satisfies every relation.
2. Choose the mechanism from the extension facts: 9 teams, 14 combinations, one reviewed builder. For every mechanism you reject, name the fact that rules it out.
3. Decide where state lives and where time comes from, using the isolation and test facts, and decide what the retry layer may retry so token expiry reaches the auth layer.
4. Compute the worst case for your order: how many times can each layer that repeats call what is inside it? Write the requests and the seconds as functions of the attempts, then take the largest attempt count whose worst case fits 15 s.
5. Write the ADR: the numbers in the context, a `We will` decision naming the mechanism, `functools.wraps` and the injected clock, rejected alternatives with the fact that ruled each out, and honest negative consequences such as the quota a failing call can spend.
6. Re-read the coherence rules against every plan value, including the request count and the worst-case latency.
