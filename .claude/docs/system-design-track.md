# System Design track

Spec and content standards of the System Design track (`src/content/system-design`). `src/verify/system-design.test.ts` enforces every rule marked *(checked)*; the rest is reviewed by hand.

## Decisions

| Decision | Choice | Reason |
| --- | --- | --- |
| Track id | `system-design` | Folder and route slug. |
| Title / short title / monogram | `System Design` / `Systems` / `SD` | `shortTitle` is the word behind the home carousel, not a navigation label. |
| Languages | `"languages": ["node", "python", "csharp"]` | The learner chooses the language of every challenge in the editor toolbar: TypeScript on the Node.js engine, Python on the Python engine (Pyodide) or C# on the C# engine (.NET WebAssembly and Roslyn). Challenges are small models of a mechanism (a rate limiter, a hash ring, a circuit breaker) with the same contract and the same tests in every language. A quiz-only lesson never starts an engine. |
| Audience | No prior architecture experience; the challenges assume basic TypeScript, Python or C# | Module 00 is optional: whoever solves the challenge of its last lesson starts at module 01. |
| Version label | `Concepts · capacity estimation · case studies · vector databases` | A topic label, never a date or a release number (see "No dates"). |
| Visibility | `TRACK_FLAGS['system-design'] = false` | Hidden while in progress; enabled once every module is written, verified and has passed an independent final review. |
| Accent | `#40e6b0` (hue about 160°) | The only hue window at least 30° away from every shown track (Python about 123°, TypeScript about 193°). Vue (hidden, about 154°) shares it: enabling Vue fails `trackPresentation.test.ts` and the accents are revisited then. |

## Content standards

- **English only.**
- **Chronological order** — a lesson never relies on a concept that a later lesson introduces. The `You need:` line names the earlier lessons it builds on by their exact `meta.json` titles, each optionally followed by a note in parentheses, joined by commas and "and"; it never names the lesson itself or a later one *(checked)*. The first lesson reads `You need: nothing. This is the first lesson of the track.` A term without its own lesson (BEAM, CDC) is explained where it is first used.
- **No bridges** *(checked)* — no comparison with another programming language or ecosystem (`## Coming from`, "if you know Java", "like in Python", PHP or Magento names). The track teaches architecture; naming a language as part of a system (Rust services, JVM garbage-collection pauses, Elixir on the BEAM) is content, not a bridge.
- **No dates** *(checked)* — lessons, track and module texts carry no changelog: no `Status as of`, no "changelog" or "release notes", no `as of <year>`, `in <year>`, `since <year>`, no ISO dates and no month-year pairs. Case studies tell the story in relative terms ("at the time", "after the migration") and teach the mechanism, which stays true when a product changes. Do not quote prices, plan limits or version numbers of hosted products. Write large numbers with separators (`2,000`, `86,400`) so they never read as years.
- **Theory template** *(checked)* — `# <Title>`, a one-paragraph introduction, a `You need: …` line, at least one concept section (`## …`), then `## Common mistakes` (2–4 bullets, 60–180 words), `## In practice` and `## Check yourself` (2–4 numbered questions) as the last three sections, in this order. The lesson's beginner mistake is the first bullet of `## Common mistakes`.
- **Length** *(checked)* — module 00: 300–1,000 words of theory; modules 01–05: 500–1,300 words.
- **Concepts** *(checked)* — `concepts.json` with 4–8 terms, each description ending with a period.
- **Quiz** *(checked)* — 5 or 6 questions, 4 distinct options each, explanations over 40 characters naming the mechanism, at least 2 different answer indexes and no index used by more than half of the questions. Scenario and trade-off questions over recall.
- **Resources** *(checked)* — 2–6 `https` links on official documentation, standards bodies, primary papers or first-party engineering blogs (`RESOURCE_HOSTS` in the suite). No tutorials, course platforms or third-party blogs. Every link is opened before it is committed.
- **Tags** *(checked)* — `practice` when the lesson has a challenge, `theory` otherwise, plus any of `core`, `case-study`, `performance`, `ai`.

## Challenges

Reference lesson: `00-fundamentals/01-client-server-and-http`.

Every lesson with a challenge ships it in every language of the track *(checked)*:

```
<lesson>/
├── challenge.md, hints.md, approach.md     TypeScript names (shared defaults, read by the Node.js variant)
└── variants/
    ├── node/    starter.ts, solution.ts, tests.ts       (entry main.ts)
    ├── python/  starter.py, solution.py, tests.py       (entry main.py)
    │            challenge.md, hints.md, approach.md     the same contract with Python names
    └── csharp/  starter.cs, solution.cs, tests.cs       (entry Program.cs)
                 challenge.md, hints.md, approach.md     the same contract with C# names
```

- **Same contract, idiomatic names.** Both variants model the same mechanism with the same behavior, edge cases and error messages, and declare the same test names in the same order *(checked)*, so a learner who switches language meets the same lesson. Test names describe behavior in plain words *(checked)*: no camelCase or snake_case identifier and no "throws"/"raises" ("a token bucket refills lazily", not "tryRemove refills"; "fails with", not "throws"). TypeScript uses camelCase and factories that return objects (`createTokenBucket({ capacity, refillPerSecond, now })`); Python uses snake_case, keyword arguments and a class where TypeScript returns an object with methods (`TokenBucket(capacity=10, refill_per_second=5, now=clock)`), plain dicts for records, `async def` where TypeScript returns a promise, and the built-in exception that fits (`ValueError`, `KeyError`, `RuntimeError`) with the same message. C# uses PascalCase members, a class with a constructor where TypeScript returns an object with methods (`new TokenBucket(capacity: 10, refillPerSecond: 5, now: clock)`), `record` types for requests, responses and results (record equality keeps assertions as direct as `toEqual`), `async Task` where TypeScript returns a promise, with the .NET `Async` suffix on every Task-returning member (`GetAsync`, `CallAsync`), `Func<double>`/`Func<long>` for injected clocks and random sources, and the exception that fits (`ArgumentException`, `InvalidOperationException`, `KeyNotFoundException`) with the same message.
- **Same numbers.** A contract never depends on a language's default rounding or formatting: `round()` rounds half to even, `Math.round` half up, and `toFixed` has binary quirks. State every rounding explicitly ("rounded half up", `Math.floor`) and implement it the same way in every variant (`Math.round(x * 10) / 10`, `math.floor(x * 10 + 0.5) / 10` and `Math.Floor(x * 10 + 0.5) / 10`; `Math.floor`, `math.floor` and `Math.Floor`, never `int()` or an `(int)` cast for negative values, which truncate). C# `Math.Round` also rounds half to even unless it gets `MidpointRounding.AwayFromZero`. A test covers a tie when the lesson rounds. Float comparisons use the same tolerance: Python's `approx` also applies `rel=1e-6` by default, so a test that mirrors `toBeCloseTo(x, 9)` writes `approx(x, abs=1e-9, rel=0)`, and C# writes `Assert.Equal(expected, actual, 1e-9)`. C# formats numbers with the invariant culture (the engine has no ICU).
- **Deterministic.** No network and no real timers: time and randomness are injected (`now: () => number` / `now: Callable[[], float]`, `random`) so tests never sleep.
- **Node.js variant:** `tests.ts` with the globals in CONTENT_GUIDE.md "Node.js track"; no `.json` files in the challenge.
- **Python variant:** `tests.py` with `@test("…")` functions and plain `assert` (CONTENT_GUIDE.md "Python engine"); standard library only.
- **C# variant:** `tests.cs` with `using Dojo;` and `[Test("…")]` methods using `Assert` (CONTENT_GUIDE.md "C# engine"); the starter and solution may open with top-level statements for the **Run** demo, which the tests ignore. Every `Assert.ThrowsAsync` is awaited *(checked)*. No source generators (`[GeneratedRegex]`): use `new Regex(…)`. Single-threaded runtime: `await`, never `.Result` or `.Wait()`.
- `challenge.md` starts with prose (no heading) and names every export, signature and behavior the tests check *(checked)*.
- 3–6 tests per variant, exactly one marked on the line right above it *(checked)*: `// beginner mistake: <what it catches>` above `test(` in TypeScript, `# beginner mistake: <what it catches>` above `@test(` in Python and `// beginner mistake: <what it catches>` above `[Test(` in C#. Test syntax and markers come from `TEST_FILES` (`src/engines/testFiles.ts`), so the suite works for any engine registered there. That test catches the most common wrong implementation, the code version of the lesson's beginner mistake when it has one (00/01: an error answered as `200`).
- The starter compiles (or imports), marks every gap with `// TODO:` or `# TODO:` and fails at least one test; code that runs at the top level of the starter (a small demo) must not throw.
- `hints.md`: 2–4 hints separated by `---`, from nudge to near-answer. `approach.md`: numbered reasoning steps, never the full solution.

## Curriculum

`(challenge)` marks the lessons with a graded challenge. Module 00 needs a challenge in its last lesson (the skip test) and in at least one earlier lesson (`src/verify/content.test.ts`).

| Lesson | Level | Beginner mistake | Challenge |
| --- | --- | --- | --- |
| **00-fundamentals — Architecture Fundamentals** (optional) | | | |
| 01-client-server-and-http | beginner | confusing HTTP with TCP | (challenge) route requests to status codes: 200, 201, 400, 404, 405 |
| 02-statelessness-and-sessions | beginner | session kept in one server's memory | (challenge) servers sharing a session store |
| 03-database-basics-sql-vs-nosql | beginner | choosing a database before the access pattern | — |
| 04-load-balancing-basics | beginner | load balancer without a shared session store | (challenge) round robin that skips unhealthy servers |
| 05-caching-fundamentals | beginner | cache as the primary store | (challenge, skip test) read-through TTL cache with hit and miss counts |
| **01-interview-framework — System Design Framework & Capacity Estimation** | | | |
| 01-four-step-interview-framework | beginner | skipping requirements clarification | — |
| 02-back-of-the-envelope-estimation | intermediate | DAU to QPS conversion errors | (challenge) QPS, peak QPS and storage estimator |
| 03-scaling-from-zero-to-one-million | intermediate | over-engineering at low scale | — |
| **02-networking-and-edge — Networking, Edge & Load Balancing** | | | |
| 01-network-protocols-grpc-websockets-sse | intermediate | HTTP polling for high-frequency streams | (challenge) Server-Sent Events encoder and parser |
| 02-advanced-load-balancing-and-p2c | intermediate | L4 balancing when path routing is needed | (challenge) L7 path routing and power of two choices |
| 03-rate-limiting-algorithms | intermediate | fixed window edge spikes | (challenge) token bucket and sliding window counter |
| **03-data-layer-and-partitioning — Data Layer, Storage Engines & Partitioning** | | | |
| 01-storage-engines-btree-vs-lsmtree | intermediate | B-tree for append-heavy writes | (challenge) MemTable, SSTables, tombstones and compaction |
| 02-database-replication-and-sharding | advanced | premature sharding | — |
| 03-consistent-hashing-with-virtual-nodes | advanced | `hash(key) % N` in a changing cluster | (challenge) hash ring with virtual nodes |
| 04-caching-patterns-and-stampede-mitigation | intermediate | write-behind when no data loss is allowed | (challenge) cache-aside with request coalescing and TTL jitter |
| **04-distributed-systems-and-resilience — Distributed Systems & Resilience** | | | |
| 01-cap-and-pacelc-theorems | advanced | claiming CA during a partition | — |
| 02-consensus-and-leader-election | advanced | an even-sized cluster or a non-majority quorum | (challenge) Raft vote and commit rules |
| 03-message-queues-and-event-streams | intermediate | assuming exactly-once delivery | (challenge) at-least-once queue with visibility timeout and dead-letter queue |
| 04-saga-pattern-and-transactional-outbox | advanced | two-phase commit across microservices | (challenge) orchestrated saga with compensations and idempotency keys |
| 05-resilience-circuit-breaker-and-bulkhead | advanced | immediate retries without backoff or jitter | (challenge) circuit breaker and full-jitter backoff |
| 06-serverless-event-driven-architecture | intermediate | always-on servers for low-volume background events | — |
| **05-real-world-case-studies-and-vector-dbs — Real-World Case Studies & Vector Databases for AI** | | | |
| 01-uber-architecture-h3-and-geospatial | advanced | latitude/longitude bounding-box scans at global scale | (challenge) grid spatial index for nearby drivers |
| 02-discord-architecture-scylladb-and-rust | advanced | ignoring garbage-collection pauses in p99 latency | — |
| 03-vector-databases-and-ann-indexes | advanced | brute-force exact k-NN in production | (challenge) exact k-NN and an IVF index with `nprobe` |
| 04-vector-database-selection-guide | advanced | a dedicated vector cluster when `pgvector` suffices | — |
| 05-ai-gateway-and-semantic-cache | advanced | a semantic cache keyed only by prompt similarity (ignoring tenant, model and system prompt) | (challenge) scoped semantic cache and provider fallback |
| **06-production-ownership — Production Ownership** | | | |
| 01-observability-slos-and-error-budgets | advanced | alerting on raw error counts instead of error-budget burn | (challenge) SLI, error budget and multi-window burn-rate alert |
| 02-multi-region-and-cell-based-architecture | advanced | active-active regions without a data conflict strategy | — |
| 03-staff-level-design-reviews | advanced | presenting one design without alternatives and trade-offs | — |

Module 04 adds two lessons to the original plan: consensus (the scope names distributed consensus) and message queues (Kafka, SQS, dead-letter queues and the outbox all rely on them), placed before the lessons that use them. Market review for staff-level interviews added two areas: AI infrastructure (05/05, an AI gateway in front of model providers) and production ownership (module 06: SLOs, multi-region and cell-based design, design reviews and migrations).
