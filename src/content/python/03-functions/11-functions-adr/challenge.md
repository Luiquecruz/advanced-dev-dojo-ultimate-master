Write the ADR and the plan for the **middleware design of an internal HTTP SDK**.

## Briefing

The platform team owns `orders-sdk`, the HTTP client that **9 product teams** use to call the orders API. Every call can go through five cross-cutting concerns, named `cache`, `metrics`, `retry`, `auth` (token refresh) and `rate_limit`.

- **Extension:** teams add concerns without editing the client and combine them per call site; today the 9 teams use **14 different combinations**. The platform team fixes the order of the concerns in **one** reviewed builder function.
- **Isolation:** each team builds its own clients. Two clients built side by side must never share a cache, a metrics sink, a token or a rate budget.
- **Traces:** errors and logs must show the original operation name (`get_order`), never `wrapper`.
- **Tests:** the 9 teams' suites run in **one process, in parallel threads**, and must never sleep or read the real time.
- **Dashboard:** the latency SLO records **one sample per client call** with the time the caller waited, **cache hits included**.
- **Cache:** a hit must not touch the network, the token service or the rate budget.
- **Tokens:** an expired token raises `AuthExpired`. The token service accepts **at most one refresh per client call**; after the refresh the request is sent again with the new token, and a second `AuthExpired` propagates.
- **Quota:** the orders API counts **every request**, retries and the request sent again after a refresh included. The token service is a different host and is not counted.
- **Retries:** transient failures (`ConnectionError`, timeouts) are retried with a fixed wait of **0.25 s** between the attempts of one retry run. The SRE team wants **at least 2** attempts per run, and as many as fit the deadline in the worst case.
- **Timing:** a request is abandoned at its **1.5 s** timeout, a refresh takes up to **0.5 s**, and callers give up after **15 s**. For the worst case, assume every request takes its full timeout whatever it returns, and that the cache, the metrics and the rate limiter take no time (the limiter never waits: when the budget is spent it raises at once).

## Task

In `adr.py`, define two constants.

**`ADR`**, the record:

- `id`: a positive integer; `title`: at least 10 characters; `status`: `"accepted"`.
- `context`: at least 80 characters; mentions the `team`s and the `deadline`.
- `decision`: at least 40 characters, starts with `We will`, names the mechanism (`decorator`, `subclass`, `interceptor` or `patch`), and names `wraps` when metadata is preserved and the `clock` when it is injected.
- `alternatives`: at least two `{"option", "reason"}` with distinct options (at least 3 characters) and reasons of at least 20 characters.
- `consequences`: `{"positive": [...], "negative": [...]}`, each with at least one item of at least 15 characters.

**`PLAN`**, the design:

- `mechanism`: `"decorators"` (decorator factories composed by one builder), `"subclassing"` (team subclasses overriding `send`), `"global_interceptors"` (registered on a shared client at import time) or `"monkey_patching"` (teams replace `Client.send` at import time).
- `order`: a list of the five concern names, **outermost first**. Derive it from this briefing: its dashboard and token facts differ from lesson 10's contract, so its stack differs too.
- `metadata_preserved`: `True` or `False`, whether every layer copies the wrapped function's metadata.
- `time_source`: `"injected_clock"`, `"system_clock"` or `"patched_time_module"`.
- `state_location`: `"closure"`, `"class_attribute"` or `"module_global"`.
- `retried_errors`: `"transient_only"` or `"all_exceptions"`, what the retry layer retries.
- `retry_attempts`: an integer, the total attempts of one retry run (as `times` in lessons 08 and 10).
- `max_requests_per_call`: an integer, the most requests one client call can send to the orders API.
- `worst_case_latency_s`: a number, the longest one client call can take with your order and your attempts. Compute it from the briefing.
- `rejected`: at least two `{"pattern", "reason"}` with distinct patterns (at least 3 characters) and reasons of at least 20 characters.

The plan must be coherent with the briefing. The tests check these relationships, so reason from the facts rather than from the field names:

1. The mechanism lets every team combine its concerns with the others without a class per combination, with the order decided in one place.
2. Each concern sits where the requirements need it: what a layer must see, skip or count decides what sits outside it.
3. State never leaks between clients, tests control time, traces keep the original names, and the retry layer leaves token expiry to the auth layer.
4. The request count and the worst-case latency follow from your order and your attempts; the worst case fits the deadline, and one more attempt would not.
5. The decision sentence names the mechanisms you put in the plan.

The tests check structure and coherence, not your wording.
