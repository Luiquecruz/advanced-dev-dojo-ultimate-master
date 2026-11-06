1. Separate the two decisions: the router answers "which pool?" from the request alone, and the balancer answers "which server?" from the pool's live state.
2. For routing, define what "matches" means before choosing among matches: segment boundaries keep `/api` from capturing `/apiary`, and `/` acts as the catch-all.
3. Among all matching routes, the most specific one is the one with the longest prefix, so scan every route and keep the best instead of returning the first hit.
4. For P2C, the value of the method comes from comparing two different servers, so derive the second index from the remaining `n - 1` slots and skip over the first.
5. Keep the in-flight counts in a dictionary that `Pick` raises and `Release` lowers, guarding against negative counts and unknown names, because a balancer must survive duplicate or late completion signals.
