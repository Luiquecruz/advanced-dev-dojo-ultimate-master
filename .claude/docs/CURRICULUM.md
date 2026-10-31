# Curriculum

Folder plan for every track. `✓` = written (the lesson folder exists with a `meta.json`); items without it are the backlog. `src/verify/curriculum.test.ts` fails when a written lesson is missing here or a `✓` points to a missing folder, so update this file in the same change as the lesson. Lesson folders use `NN-lesson-id`. Each lesson has theory + challenge (+ quiz when useful) unless marked **(quiz)**, which means theory + 4–6 question quiz only.

## TypeScript (`src/content/typescript`)

### 01-basics — Type Basics
01-primitive-annotations ✓ · 02-unknown-vs-any ✓ · 03-type-inference ✓ · 04-arrays-and-tuples ✓ · 05-literal-types-and-const-assertions ✓ · 06-enums-vs-union-types (enums, const enums, erasableSyntaxOnly) ✓ · 07-void-never-null-undefined (strictNullChecks) ✓

### 02-functions — Functions
01-function-type-annotations ✓ · 02-optional-default-rest-parameters ✓ · 03-function-type-expressions-and-call-signatures ✓ · 04-overloads ✓ · 05-this-parameter ✓ · 06-higher-order-functions-and-callbacks ✓

### 03-objects — Objects and Interfaces
01-object-type-literals ✓ · 02-readonly-properties ✓ · 03-index-signatures-and-records ✓ · 04-interfaces ✓ · 05-extending-interfaces ✓ · 06-intersection-types ✓ · 07-type-alias-vs-interface ✓ · 08-excess-property-checks ✓ · 09-nested-objects ✓ · 10-declaration-merging ✓ · 11-structural-typing ✓

### 04-narrowing — Unions and Narrowing
01-union-types ✓ · 02-typeof-instanceof-in-narrowing ✓ · 03-discriminated-unions ✓ · 04-exhaustiveness-with-never ✓ · 05-type-predicates ✓ · 06-assertion-functions ✓ · 07-control-flow-analysis **(quiz)** ✓

### 05-classes — Classes
01-class-basics ✓ · 02-access-modifiers-and-private-fields ✓ · 03-parameter-properties ✓ · 04-abstract-classes ✓ · 05-implementing-interfaces ✓ · 06-accessors-and-static-members ✓ · 07-override-and-inheritance ✓

### 06-generics — Generics
01-generic-functions ✓ · 02-generic-constraints ✓ · 03-generic-interfaces-and-classes ✓ · 04-keyof-and-indexed-access ✓ · 05-default-type-parameters ✓ · 06-const-type-parameters ✓

### 07-utility-types — Built-in Utility Types
01-partial-required-readonly ✓ · 02-pick-and-omit ✓ · 03-record ✓ · 04-exclude-extract-nonnullable ✓ · 05-returntype-parameters-awaited ✓ · 06-noinfer-and-inference-control ✓

### 08-advanced-types — Advanced Types
01-conditional-types ✓ · 02-infer ✓ · 03-distributive-conditional-types ✓ · 04-mapped-types ✓ · 05-key-remapping ✓ · 06-template-literal-types ✓ · 07-recursive-types ✓ · 08-satisfies-operator ✓

### 09-type-level-programming — Type-Level Challenges (expert)
01-deep-readonly ✓ · 02-tuple-utilities (TupleToUnion, First, Last, Length) ✓ · 03-string-manipulation-types ✓ · 04-object-path-types (Paths/Get) ✓ · 05-chainable-builder-type ✓ · 06-union-to-intersection ✓

### 10-async-and-errors — Async, Iteration and Errors
01-promises-and-async-await ✓ · 02-error-handling-with-unknown ✓ · 03-result-type-pattern ✓ · 04-iterators-and-generators ✓ · 05-async-iterators ✓ · 06-using-and-resource-management ✓

### 11-tooling — Modules, Declarations and Tooling
01-es-modules-and-type-imports **(quiz)** ✓ · 02-declaration-files **(quiz)** ✓ · 03-tsconfig-and-ts6-defaults **(quiz)** ✓ · 04-module-resolution **(quiz)** ✓ · 05-typescript-7-native-compiler **(quiz)** ✓ · 06-type-stripping-and-erasable-syntax **(quiz)** ✓

### 12-patterns — Decorators and Real-World Patterns
01-standard-decorators ✓ · 02-legacy-experimental-decorators **(quiz)** ✓ · 03-branded-types ✓ · 04-type-safe-event-emitter ✓ · 05-type-safe-builder ✓ · 06-dependency-injection-container ✓

## React (`src/content/react`) — complete: 100 lessons, every challenge verified in jsdom and in Chrome

### 01-foundations — Foundations
00-what-is-react **(quiz)** ✓ · 01-jsx-basics ✓ · 02-components ✓ · 03-props ✓ · 04-children-and-composition ✓ · 05-conditional-rendering ✓ · 06-lists-and-keys ✓ · 07-events ✓ · 08-tooling-and-project-setup **(quiz)** (Vite, CRA sunset, frameworks) ✓

### 02-state — State and Interactivity
01-use-state ✓ · 02-state-as-snapshot-and-batching ✓ · 03-updating-objects-and-arrays ✓ · 04-controlled-inputs ✓ · 05-lifting-state-up ✓ · 06-preserving-and-resetting-state ✓ · 07-choosing-state-structure ✓

### 03-hooks — Core Hooks
01-rules-of-hooks **(quiz)** ✓ · 02-use-ref ✓ · 03-use-reducer ✓ · 04-use-effect ✓ · 05-effect-cleanup-and-subscriptions ✓ · 06-you-might-not-need-an-effect ✓ · 07-use-context ✓ · 08-context-with-reducer ✓ · 09-custom-hooks ✓ · 10-use-layout-effect ✓ · 11-use-imperative-handle ✓ · 12-use-id ✓ · 13-use-sync-external-store ✓

### 04-performance — Performance and Concurrency
01-rendering-and-reconciliation **(quiz)** (render/commit, Fiber, keys) ✓ · 02-memo ✓ · 03-use-memo ✓ · 04-use-callback ✓ · 05-use-transition ✓ · 06-use-deferred-value ✓ · 07-lazy-and-suspense ✓ · 08-react-compiler **(quiz)** ✓ · 09-profiler-and-devtools ✓

### 05-legacy — Class Components and Legacy APIs
01-class-components ✓ · 02-lifecycle-methods ✓ · 03-advanced-lifecycle (getDerivedStateFromProps, shouldComponentUpdate, PureComponent, getSnapshotBeforeUpdate) ✓ · 04-error-boundaries ✓ · 05-higher-order-components ✓ · 06-render-props ✓ · 07-forward-ref-and-create-ref ✓ · 08-removed-and-deprecated-apis **(quiz)** (createClass, mixins, PropTypes, defaultProps on functions, legacy context, ReactDOM.render, findDOMNode, string refs, UNSAFE_*) ✓ · 09-migrating-classes-to-hooks ✓

### 06-patterns — Advanced Patterns and DOM APIs
01-portals ✓ · 02-compound-components ✓ · 03-controlled-vs-uncontrolled-components ✓ · 04-strict-mode **(quiz)** ✓ · 05-callback-refs ✓ · 06-headless-components-and-hooks ✓ · 07-flush-sync ✓

### 07-react-19 — React 19 and Beyond
01-actions-and-async-transitions ✓ · 02-use-action-state ✓ · 03-use-form-status ✓ · 04-use-optimistic ✓ · 05-use-api ✓ · 06-ref-as-prop-and-context-as-provider ✓ · 07-document-metadata-and-resource-preloading ✓ · 08-activity ✓ · 09-use-effect-event ✓ · 10-view-transitions ✓ · 11-fragment-refs ✓ · 12-server-components-and-server-functions **(quiz)** ✓

### 08-routing — Routing
01-react-router-basics ✓ · 02-dynamic-and-nested-routes ✓ · 03-data-routers-and-loaders ✓ · 04-routing-landscape **(quiz)** (TanStack Router, Next.js App Router, framework mode) ✓

### 09-state-management — State Management
01-when-to-use-global-state **(quiz)** ✓ · 02-zustand ✓ · 03-redux-toolkit ✓ · 04-jotai ✓ · 05-other-libraries **(quiz)** (MobX, Valtio, XState, Recoil sunset) ✓

### 10-data-fetching — Data Fetching
01-fetch-patterns-and-custom-hooks ✓ · 02-tanstack-query ✓ · 03-mutations-and-cache-invalidation ✓ · 04-suspense-for-data ✓ · 05-swr-graphql-and-alternatives **(quiz)** ✓

### 11-forms — Forms
01-form-basics-and-validation ✓ · 02-react-hook-form ✓ · 03-zod-schemas ✓ · 04-form-actions-and-formdata ✓

### 12-styling — Styling and Animation
01-styling-approaches (inline, CSS Modules, CSS-in-JS, utility classes, clsx) ✓ · 02-tailwind-css ✓ · 03-component-libraries **(quiz)** (shadcn/ui, Radix, MUI, Chakra, headless) ✓ · 04-animation ✓

### 13-typescript — React with TypeScript
01-typing-props-and-children ✓ · 02-typing-hooks-and-events ✓ · 03-generic-components ✓ · 04-component-prop-utilities (ComponentProps, PropsWithChildren, discriminated props) ✓

### 14-testing — Testing
01-testing-landscape **(quiz)** (Vitest, Jest, RTL, Playwright, Cypress) ✓ · 02-accessible-queries ✓ · 03-testing-async-and-mocks ✓

### 15-ecosystem — Frameworks and Beyond
01-ssr-ssg-and-hydration (renderToString challenge) ✓ · 02-nextjs-and-meta-frameworks **(quiz)** ✓ · 03-react-native **(quiz)** ✓ · 04-security-and-xss ✓ · 05-accessibility ✓

## React State Management (`src/content/react-state`, engine `react`)

Short and precise, more quizzes. Every lesson has a quiz (3–5 questions) unless marked otherwise; every theory ends with a **"When to use it / when not to"** section. Goes deeper than `react/09-state-management` without repeating it.

### 01-foundations — State Fundamentals
01-what-is-state-and-where-it-lives **(quiz)** (UI, shared client, server cache, URL, form state; derived values are not state) ✓ · 02-local-state-and-derived-values ✓ · 03-reducers-as-explicit-transitions (discriminated actions, status as a finite state) ✓ · 04-immutable-updates-with-immer (immer, use-immer) ✓

### 02-native-sharing — Sharing State with React Alone
01-lifting-state-and-composition ✓ · 02-context-api-done-right (provider + guarded hook, `<Context value>`) ✓ · 03-context-performance-pitfalls (split state/dispatch, stable values, measuring re-renders) ✓ · 04-url-as-state (useSearchParams) ✓ · 05-use-sync-external-store-from-scratch (store with selectors) ✓

### 03-client-state-libraries — Client State Libraries
01-zustand-essentials ✓ · 02-zustand-in-production (persist/immer/devtools middleware, slices, useShallow, vanilla store, resetting in tests) ✓ · 03-redux-toolkit-essentials (slices, configureStore, typed hooks, createSelector) ✓ · 04-redux-toolkit-at-scale (createEntityAdapter, createAsyncThunk, listener middleware) ✓ · 05-jotai-atomic-state (derived/writable atoms, atomWithStorage, Provider scoping) ✓ · 06-proxy-state-mobx-and-valtio ✓ · 07-state-machines-with-xstate (v5 setup/createMachine, useMachine) ✓ · 08-library-comparison **(quiz)** ✓

### 04-server-state — Server State
01-server-state-is-a-cache **(quiz)** ✓ · 02-tanstack-query-as-your-server-store (query keys, staleTime, select, dependent queries) ✓ · 03-mutations-and-optimistic-updates (onMutate snapshot, rollback, invalidation) ✓ · 04-rtk-query (createApi, tags, invalidation) ✓

### 05-architecture — Architecture and Decision Making
01-choosing-the-right-tool **(quiz)** (scenario based) ✓ · 02-colocation-and-boundaries (refactor over-globalized state) ✓ · 03-forms-and-transient-state **(quiz)** ✓ · 04-react-19-compiler-and-the-future-of-state **(quiz)** (Actions, useOptimistic, Server Components, React Compiler) ✓ · 05-capstone-state-architecture (multi-file: server state + client store + URL + local state) ✓

## React Architecture (`src/content/architecture`, engine `react`)

From static pages to micro-frontends, following the spec in `.claude/specs/Trilha Arquitetura com React.md` (its "Adaptação para o Dev Dojo" section maps every spec item to a lesson). Every lesson has a quiz (3–5 questions) unless marked **(quiz)** (4–6 questions, no challenge) or **(adr)** (ADR checkpoint: the learner writes the module's ADR as a data object checked for structure and coherence with a briefing); every theory ends with a **"When to choose it"** section. Server-side models (MVC, SSR, streaming, SSG, ISR, RSC, BFF) run as plain functions in the sandbox: the "server" is a function that receives a request and returns HTML, a stream or JSON. Multi-file challenges use real folder structures (`features/catalog/index.js`). State libraries are covered in depth by `react-state`; module 04 only covers state at the architecture level.

### 01-foundations — Architecture Fundamentals
01-what-is-frontend-architecture **(quiz)** (React as a library, the four decision layers, architecture vs component design vs folders) ✓ · 02-quality-attributes-and-trade-offs **(quiz)** (performance, SEO, maintainability, testability, team autonomy, cost) ✓ · 03-architecture-decision-records (ADR format and status lifecycle: proposed, accepted, superseded) ✓

### 02-rendering — Rendering Architectures
01-static-pages (static file server: index files, 404, content types, cache headers) ✓ · 02-model-view-controller (multi-file: model, React views rendered to HTML, controller per request) ✓ · 03-single-page-applications (client router from scratch: History API, link interception, client data fetching) ✓ · 04-server-side-rendering (per-request render, serialized data, hydration) ✓ · 05-streaming-ssr-and-suspense (`renderToReadableStream`, shell first, Suspense boundaries streamed in, errors per boundary) ✓ · 06-static-site-generation (build step with static paths and props, frozen data, 404 for unknown paths) ✓ · 07-incremental-static-regeneration (stale-while-revalidate with injected clock, deduplicated regeneration, on-demand revalidation) ✓ · 08-islands-architecture (hydrating only `data-island` roots) ✓ · 09-react-server-components (toy server/client boundary: server components run on the server, client references, serializable props, children slots) ✓ · 10-measuring-rendering-models (TTFB, FCP, LCP, TBT and JS bytes from simulated traces of each model) ✓ · 11-choosing-a-rendering-strategy **(quiz)** (per-route decisions, data freshness vs cost) ✓ · 12-rendering-adr **(adr)** ✓

### 03-code-organization — Code Organization
01-by-type-vs-by-feature **(quiz)** (screaming architecture, Bulletproof React, MVC legacy) ✓ · 02-feature-modules-and-public-apis (multi-file: features behind `index.js`, no deep imports) ✓ · 03-layered-dependency-rules (Feature-Sliced Design layers, a dependency rule checker) ✓ · 04-hexagonal-frontend (multi-file: domain use case, port, HTTP and in-memory adapters) ✓ · 05-from-containers-to-hooks (container/presentational refactored into a custom hook) ✓ · 06-atomic-design-and-design-systems **(quiz)** ✓ · 07-code-organization-adr **(adr)** ✓

### 04-state-and-data — State and Data
01-classifying-state **(quiz)** (remote, URL, form, UI, derived; one home per kind) ✓ · 02-url-as-source-of-truth (typed search schema, canonical URLs, `useSearchParams`) ✓ · 03-data-access-layer (API client, query key factory and `queryOptions` per feature) ✓ · 04-server-state-across-the-network (prefetch on the server, `dehydrate`, `HydrationBoundary`) ✓ · 05-checkout-three-ways (multi-file: one checkout contract implemented with `useReducer`, TanStack Query + Context and XState) ✓ · 06-state-and-data-adr **(adr)** ✓

### 05-scale — Architectures at Scale
01-from-monolith-to-micro-frontends **(quiz)** (monolith, modular monolith, monorepo, micro-frontends; organizational problems) ✓ · 02-modular-front-end-monolith (multi-file: modules register routes and navigation in a shell, communicate through events) ✓ · 03-backend-for-frontend (aggregating services into a view model, partial failures, status mapping) ✓ · 04-micro-frontend-runtime-composition (framework-agnostic `mount`/`unmount` contract, error isolation, custom events) ✓ · 05-micro-frontends-with-web-components (React inside a custom element, attributes to props, events out) ✓ · 06-monorepo-task-graph (affected packages, build levels, content-hash cache) ✓ · 07-module-federation-shared-dependencies (share scope, singletons, version ranges, strictVersion) ✓ · 08-module-federation-monorepos-and-design-systems **(quiz)** (build-time vs runtime composition, Nx, Turborepo, design system as a platform) ✓ · 09-scale-adr **(adr)** ✓

### 06-decisions — Decisions and Capstone
01-choosing-an-architecture **(quiz)** (scenario based) ✓ · 02-over-engineering-and-anti-patterns **(quiz)** ✓ · 03-architecture-from-a-briefing (decision rules per layer from a product briefing) ✓ · 04-capstone-walking-skeleton (multi-file: four-layer ADRs, trade-offs, feature module, BFF, server render and hydration) ✓

## AI Engineering (`src/content/ai-engineering`, languages `node`; Python later)

Spec: `.claude/specs/AI Engineering Track.md`. Hidden by `TRACK_FLAGS` until enough modules are written. Six decision layers (model, context, harness, loop, evaluation, governance) plus agentic engineering. Every module opens with a **map** lesson (what the module answers, its layer, prerequisites, the path) and ends with an **(adr)** checkpoint, as in React Architecture. Challenges are multi-language (`variants/node/` now, `variants/python/` later) and run against the fake model (`@dojo/ai`, see CONTENT_GUIDE.md "Fake model"): assert handling and properties with `forEachSeed`, never exact model wording. Every theory ends with **"When to choose it"**; volatile facts (tools, versions, laws, prices) go in a "Status as of <date>" box. Every lesson has a quiz (3–5 questions) unless marked **(quiz)** (4–6 questions, no challenge).

### 01-models — Models for Engineers
01-map **(quiz)** (how the track works: six layers, fake model, languages, maturity tags) · 02-how-llms-behave **(quiz)** (tokens, context window, sampling, non-determinism, hallucination, sycophancy) · 03-calling-a-model (provider-agnostic `complete()` wrapper: text, finish reasons, usage) · 04-tokens-cost-and-latency (cost estimator and budget guard) · 05-model-families **(quiz)** (frontier, open weights, small models, reasoning, multimodal, cognitive core) · 06-retries-routing-and-fallbacks (backoff honoring `retryAfterMs`, cheap-first routing, provider fallback) · 07-benchmarks-and-their-limits **(quiz)** · 08-models-adr **(adr)**

### 02-prompts-and-context — Prompt and Context Engineering
01-map **(quiz)** · 02-prompt-anatomy (system, role, task, constraints, examples, output format as a message builder) · 03-structured-outputs (schema validation with Zod, repair and retry across every malformed shape) · 04-choosing-examples (few-shot examples selected by similarity) · 05-context-engineering (context builder under a token budget: select, compress, order, drop; context rot) · 06-prompts-as-code (versioned prompt registry, render, rollback, tests per prompt) · 07-caching-and-batching **(quiz)** · 08-prompts-adr **(adr)**

### 03-tools-and-protocols — Tools and Protocols
01-map **(quiz)** · 02-function-calling (execute tool calls, return tool messages, invalid arguments and unknown tools) · 03-designing-tools-for-models (schemas, model-friendly errors, minimal outputs) · 04-mcp-concepts **(quiz)** (hosts, clients, servers, tools, resources, prompts, transports, auth) · 05-building-an-mcp-server (JSON-RPC: initialize, tools/list, tools/call, resources/read over an in-memory transport) · 06-mcp-clients-and-tool-overload (discover tools across servers, namespace them, load on demand) · 07-a2a-skills-and-context-files **(quiz)** (A2A, Agent Skills, AGENTS.md, the Agentic AI Foundation) · 08-tools-adr **(adr)**

### 04-retrieval-and-rag — Retrieval and RAG
01-map **(quiz)** · 02-chunking (fixed, recursive and structure-aware chunkers with overlap and metadata) · 03-vector-search (in-memory index, cosine top-k, metadata filters) · 04-bm25-and-hybrid-search (BM25 plus Reciprocal Rank Fusion) · 05-query-rewriting-and-reranking (multi-query, HyDE, model-scored reranking) · 06-grounded-answers-and-citations (sources in context, citation validation, refusing without evidence) · 07-evaluating-retrieval (recall@k, MRR, nDCG on a golden set) · 08-permission-aware-retrieval (tenants, ACL filtering, updates and deletions) · 09-agentic-rag-and-long-context **(quiz)** · 10-rag-adr **(adr)**

### 05-knowledge-graphs — Knowledge Graphs and Ontologies
01-map **(quiz)** · 02-graphs-as-data-structures (property graph, traversal, multi-hop questions) · 03-ontologies (classes, properties, domain/range and cardinality validation) · 04-extracting-a-knowledge-graph (model extraction as JSON, validation against the ontology, entity resolution) · 05-graphrag (communities, summaries, local vs global questions) · 06-semantic-layer-and-rdf **(quiz)** (RDF vs property graphs, SPARQL vs Cypher, semantic layer) · 07-knowledge-adr **(adr)**

### 06-memory — Memory
01-map **(quiz)** · 02-memory-types **(quiz)** (working, episodic, semantic, procedural; CoALA) · 03-conversation-memory (sliding window plus summary under a token budget) · 04-long-term-memory (write policy, deduplication, retrieval by relevance, recency and importance) · 05-temporal-graph-memory (bi-temporal facts, invalidation on contradiction, as-of queries) · 06-memory-poisoning-and-privacy (isolation per user, provenance, retention and erasure) · 07-memory-adr **(adr)**

### 07-agents — Agents and Workflows
01-map **(quiz)** · 02-workflows-vs-agents **(quiz)** · 03-workflow-patterns (chaining, routing, parallelization, evaluator-optimizer) · 04-the-agent-loop (observe, act with tools, stop on a final answer) · 05-budgets-and-stop-conditions (steps, tokens, cost, time, stuck detection) · 06-human-in-the-loop (approval gates, interrupt and resume with serialized state) · 07-durable-execution (checkpoints, resume after a crash, idempotent tools) · 08-computer-use-and-code-agents **(quiz)** · 09-agents-adr **(adr)**

### 08-harness-and-loops — Harness and Loop Engineering
01-map **(quiz)** · 02-what-is-a-harness **(quiz)** (same model, different harness; components; context files) · 03-permission-policies (allow, ask, deny rules with patterns and precedence) · 04-sandboxing-tools (path jail on the virtual file system, network egress allowlist) · 05-hooks (pre and post tool hooks: block, rewrite, audit) · 06-verifiers (checks the agent must pass, feedback into the next step) · 07-loop-engineering (trigger, act, verify, stop rule, persistent state, escalation) · 08-long-running-agents (progress files, task lists, resuming across sessions) · 09-harness-adr **(adr)**

### 09-multi-agent — Multi-Agent Systems
01-map **(quiz)** · 02-why-multiple-agents **(quiz)** · 03-orchestrator-workers (planner, parallel workers, synthesis, cost accounting) · 04-handoffs-and-swarms (control passing between peer agents, loop and depth limits) · 05-shared-state (blackboard with ownership and conflict rules) · 06-multi-agent-failure-modes (cascading errors, agreement bias, delegation limits) · 07-agent-to-agent-protocols **(quiz)** (A2A agent cards and tasks, MCP vs A2A) · 08-multi-agent-adr **(adr)**

### 10-evals-and-observability — Evaluation and Observability
01-map **(quiz)** · 02-evals-as-tests (golden dataset, exact, schema and semantic scorers, report) · 03-llm-as-judge (rubric judge, calibration against human labels, position bias) · 04-regression-gates (compare prompt or model versions, block regressions) · 05-agent-trajectory-evals (right tools, order, forbidden calls, step and cost limits) · 06-tracing (spans per model and tool call, GenAI attributes, token and cost rollups) · 07-production-feedback-and-drift **(quiz)** · 08-evals-adr **(adr)**

### 11-model-adaptation — Model Adaptation and Open Models (concepts only for now)
01-map **(quiz)** · 02-the-adaptation-ladder **(quiz)** · 03-fine-tuning-and-lora **(quiz)** · 04-preference-and-reinforcement-tuning **(quiz)** (RLHF, DPO, GRPO, verifiable rewards, distillation) · 05-synthetic-data **(quiz)** · 06-hugging-face-ecosystem **(quiz)** (Hub, cards, transformers, datasets, PEFT, TRL, smolagents, licenses) · 07-local-inference-and-quantization **(quiz)** (Ollama, llama.cpp, vLLM, SGLang, GGUF, memory math) · 08-model-supply-chain **(quiz)** (safetensors vs pickle, provenance, AI-BOM) · 09-adaptation-adr **(adr)**

### 12-security — Security
01-map **(quiz)** · 02-prompt-injection **(quiz)** (direct and indirect, why prompts cannot fix it) · 03-lethal-trifecta (analyze an agent's tools for private data, untrusted input and exfiltration; remove a leg) · 04-exfiltration-and-output-handling (markdown images and links, allowlists, encoding) · 05-least-privilege-and-secrets (scoped short-lived credentials, secrets out of context) · 06-tool-poisoning-and-supply-chain (hidden instructions in tool descriptions, pinned tool hashes, rug pulls) · 07-guardrails (input and output checks, PII redaction, limits) · 08-red-teaming (adversarial eval suite with injected documents) · 09-owasp-top-10s **(quiz)** (LLM Applications 2025, Agentic Applications 2026) · 10-threat-model-adr **(adr)**

### 13-governance — Governance in Layers
01-map **(quiz)** · 02-governance-layers **(quiz)** · 03-inventory-and-sprawl (registry with owners, orphaned agents, expiring credentials, shadow AI signals) · 04-agent-identity-and-runtime-policy (identity per agent, policy decision per tool call, audit log) · 05-data-governance-for-ai (classification, purpose and consent checks before a model call, retention) · 06-model-governance (registry, promotion gated by evals, pinned versions, deprecation) · 07-cost-governance (budgets per team and feature, alerts, rate limits) · 08-regulation-principles **(quiz)** · 09-eu-ai-act **(quiz)** · 10-brazil-lgpd-and-pl-2338 **(quiz)** · 11-global-regulatory-map (obligations per jurisdiction for a product's features) · 12-governance-adr **(adr)**

### 14-agentic-engineering — Agentic Engineering and Capstone
01-map **(quiz)** · 02-vibe-coding-vs-agentic-engineering **(quiz)** · 03-spec-driven-development (spec to tasks to tests traceability) · 04-context-files-and-skills (skill index loaded on demand by relevance) · 05-working-with-coding-agents **(quiz)** (small verifiable steps, TDD, worktrees, review depth, comprehension debt) · 06-ai-feature-ux **(quiz)** (streaming, uncertainty, sources, feedback, fallbacks) · 07-measuring-impact **(quiz)** · 08-what-changed **(quiz)** (changelog updated each quarterly review) · 09-capstone (multi-file: RAG plus tools over MCP, an agent with budgets and a verifier inside a permission harness, evals, threat model and governance map)

## Vue (`src/content/vue`)

### 01-foundations — Foundations
00-what-is-vue **(quiz)** (progressive framework, SFC, Vite, create-vue) ✓ · 01-sfc-and-template-syntax ✓ · 02-attribute-bindings ✓ · 03-conditional-rendering (v-if/v-else/v-show) ✓ · 04-list-rendering (v-for, keys) ✓ · 05-event-handling (modifiers) ✓ · 06-form-bindings (v-model on inputs, modifiers) ✓ · 07-class-and-style-bindings ✓

### 02-reactivity — Reactivity
01-ref-and-reactive ✓ · 02-computed ✓ · 03-watch-and-watcheffect ✓ · 04-watcher-cleanup-and-flush-timing (onWatcherCleanup, flush: post) ✓ · 05-shallow-and-raw-reactivity (shallowRef, markRaw, toRaw, triggerRef) ✓ · 06-toref-torefs-and-destructuring ✓ · 07-reactivity-in-depth **(quiz)** (proxies, dependency tracking, nextTick, alien-signals/3.6) ✓

### 03-components — Components in Depth
01-components-and-props (defineProps, reactive props destructure) ✓ · 02-emits ✓ · 03-component-v-model (defineModel) ✓ · 04-slots (named, scoped) ✓ · 05-provide-inject ✓ · 06-template-refs-and-expose (useTemplateRef, defineExpose) ✓ · 07-dynamic-and-async-components ✓ · 08-lifecycle-hooks ✓ · 09-fallthrough-attributes ✓ · 10-use-id-and-define-options ✓ · 11-generic-components ✓

### 04-built-ins — Built-in Components and Advanced APIs
01-transition-and-transition-group ✓ · 02-keep-alive ✓ · 03-teleport ✓ · 04-suspense ✓ · 05-custom-directives · 06-render-functions-and-jsx · 07-plugins

### 05-composables — Composables and VueUse
01-writing-composables · 02-async-composables (useFetch-like with cleanup) · 03-vueuse-essentials · 04-composable-patterns **(quiz)**

### 06-router — Vue Router 5
01-router-basics ✓ · 02-dynamic-routes-and-params ✓ · 03-nested-and-named-routes ✓ · 04-navigation-guards ✓ · 05-lazy-loading-and-file-based-routing **(quiz)** ✓

### 07-state — State Management with Pinia 4
01-pinia-option-stores ✓ · 02-pinia-setup-stores ✓ · 03-store-to-refs-and-composition ✓ · 04-pinia-plugins-and-testing ✓ · 05-vuex-legacy **(quiz)** ✓

### 08-data-and-forms — Data Fetching and Forms
01-fetching-data ✓ · 02-tanstack-vue-query ✓ · 03-form-validation-with-vee-validate ✓ · 04-schema-validation-with-zod ✓

### 09-typescript — Vue with TypeScript
01-typing-props-and-emits · 02-typing-refs-and-composables · 03-typing-provide-inject-and-slots

### 10-testing — Testing Vue
01-vitest-and-vue-test-utils (challenge: component testable via data-testid/roles) · 02-testing-composables-and-stores · 03-testing-landscape **(quiz)**

### 11-legacy — Options API and Vue 2 Legacy
01-options-api · 02-options-api-lifecycle-and-watchers · 03-mixins-and-why-composables-replaced-them · 04-vue2-to-vue3-migration **(quiz)** (filters, $on/$off event bus, $listeners, .sync, Vue.set)

### 12-ecosystem — Ecosystem
01-nuxt **(quiz)** · 02-ssr-and-hydration **(quiz)** · 03-vapor-mode-and-vue-3-6 **(quiz)** · 04-performance-optimization (v-once, v-memo, shallowRef lists)

## Angular (`src/content/angular`)

### 01-foundations — Foundations
00-what-is-angular **(quiz)** (CLI, standalone, signals era, file naming v20+) ✓ · 01-standalone-components ✓ · 02-template-syntax-and-bindings ✓ · 03-control-flow (@if/@for/@switch/@let, track) ✓ · 04-event-binding ✓ · 05-signal-inputs (input(), required, transform) ✓ · 06-outputs (output(), outputFromObservable) ✓ · 07-model-inputs (two-way binding with model()) ✓ · 08-content-projection ✓ · 09-lifecycle-hooks ✓ · 10-pipes ✓

### 02-signals — Signals
01-signal-computed-effect ✓ · 02-linked-signal ✓ · 03-untracked-and-effect-cleanup ✓ · 04-resource (resource(), status, reload) · 05-http-resource · 06-rxjs-interop (toSignal, toObservable)

### 03-dependency-injection — Dependency Injection
01-services-and-inject ✓ · 02-providers-and-injection-tokens ✓ · 03-hierarchical-injectors ✓ · 04-environment-and-app-initializers ✓

### 04-rxjs — RxJS
01-observables-basics ✓ · 02-operators (map, filter, switchMap, debounceTime) ✓ · 03-subjects-and-state ✓ · 04-async-pipe-and-subscriptions (takeUntilDestroyed) ✓

### 05-templates-and-directives — Templates and Directives
01-attribute-directives (host bindings, hostDirectives) ✓ · 02-custom-structural-directives ✓ · 03-ng-template-and-outlets ✓ · 04-view-and-content-queries (viewChild(), contentChildren()) ✓ · 05-dynamic-components ✓ · 06-defer-blocks ✓

### 06-change-detection — Change Detection
01-zoneless-change-detection **(quiz)** · 02-onpush-and-eager-strategies · 03-zonejs-legacy **(quiz)**

### 07-routing — Router
01-router-basics ✓ · 02-route-params-and-component-input-binding ✓ · 03-functional-guards ✓ · 04-resolvers ✓ · 05-lazy-loading **(quiz)** ✓

### 08-forms — Forms
01-template-driven-forms ✓ · 02-reactive-forms ✓ · 03-typed-reactive-forms-and-validators ✓ · 04-signal-forms ✓ · 05-signal-forms-validation-and-submit ✓

### 09-http — HTTP
01-http-client ✓ · 02-functional-interceptors ✓ · 03-http-error-handling ✓

### 10-state — State Management
01-signal-based-services ✓ · 02-ngrx-signal-store ✓ · 03-ngrx-signal-store-features (withComputed, withMethods, withEntities, withHooks) ✓ · 04-ngrx-store-classic (actions, reducers, selectors) ✓

### 11-testing — Testing
01-testbed-and-vitest ✓ · 02-testing-services-and-http ✓ · 03-component-harnesses **(quiz)** ✓

### 12-legacy — Legacy Angular
01-ngmodules ✓ · 02-constructor-injection-and-decorator-inputs (@Input/@Output) ✓ · 03-structural-directives-ngif-ngfor ✓ · 04-angularjs-and-migration-history **(quiz)** ✓

### 13-ecosystem — SSR and Ecosystem
01-ssr-and-hydration **(quiz)** (incremental hydration, event replay) ✓ · 02-angular-cli-and-builders **(quiz)** (esbuild, Vite dev server) · 03-accessibility-and-angular-aria **(quiz)** · 04-performance (trackBy/track, @defer, NgOptimizedImage) **(quiz)**

## Node.js (`src/content/node`, engine `node`)

Backend for frontend developers who build with AI: enough depth to choose an approach, brief an assistant and review what it generates. Lessons are TypeScript. Every theory ends with **"When to choose it"** and **"Working with AI"** sections. Challenges run on the in-browser Node runtime (see CONTENT_GUIDE.md); topics it cannot execute (worker threads, clustering, real databases, deployment) are quizzes.

### 01-runtime — The Node.js Runtime
01-what-is-nodejs **(quiz)** (V8 + libuv, non-blocking I/O, Node vs browser, LTS releases, Deno and Bun) ✓ · 02-modules-esm-and-commonjs (multi-file: named/default exports, `node:` prefix, `type: module`, `exports` map) ✓ · 03-process-env-and-cli (`process.env` config with defaults, `util.parseArgs`, exit codes) ✓ · 04-event-loop (phases, microtasks, `nextTick`, `setImmediate`, blocking the loop; challenge: predict execution order) ✓ · 05-npm-and-package-management **(quiz)** (semver, lockfiles, dependencies vs devDependencies, scripts, npx, pnpm, supply-chain risks) ✓

### 02-async — Asynchronous Patterns
01-callbacks-and-promisify (error-first callbacks, writing `promisify`) ✓ · 02-promise-combinators (`all`, `allSettled`, `race`, `any`) ✓ · 03-concurrency-limits (map with a concurrency limit) ✓ · 04-cancellation-and-timeouts (`AbortController`, `AbortSignal.timeout`, `AbortSignal.any`) ✓ · 05-retries-and-backoff (exponential backoff with jitter, retryable errors) ✓ · 06-async-iterators-and-generators (paginated API as an async iterable) ✓

### 03-core-apis — Core Modules
01-event-emitter (typed emitter, `once`, the `'error'` event) ✓ · 02-buffers-and-encodings (bytes vs characters, utf8, base64, hex) ✓ · 03-file-system (`fs/promises`, JSON files, `ENOENT` handling, atomic writes) ✓ · 04-paths-and-urls (`path`, `URL`, path traversal guard) ✓ · 05-streams (Readable, Writable, async iteration, memory) ✓ · 06-transform-and-pipeline (Transform, `pipeline`, backpressure) ✓ · 07-crypto-basics (hashes, HMAC, random ids, `timingSafeEqual`) ✓

### 04-http — HTTP from Scratch
01-how-http-works **(quiz)** (methods, status codes, headers, idempotency, caching, CORS) ✓ · 02-node-http-server ✓ · 03-routing-and-request-bodies (route table with params, JSON body parsing, 400/413/415) ✓ · 04-middleware-pipeline (Koa-style `compose`, how Express and Hono work) ✓ · 05-calling-other-services (`fetch` with timeouts, status checks, error mapping) ✓

### 05-rest-apis — REST APIs with Hono
01-choosing-a-framework **(quiz)** (Express, Fastify, Hono, NestJS, Koa, meta-framework route handlers) ✓ · 02-hono-fundamentals (routes, params, query, context, status codes) ✓ · 03-rest-resource-design (CRUD, 201 + Location, 204, 404, 409) ✓ · 04-validation-with-zod (`zValidator`, error shape) ✓ · 05-error-handling (`HTTPException`, `onError`, `notFound`, domain errors) ✓ · 06-pagination-filtering-sorting (offset vs cursor) ✓ · 07-middleware-in-practice (CORS, request id, logging, timing) ✓ · 08-api-styles **(quiz)** (REST, GraphQL, tRPC, gRPC, WebSockets, SSE, webhooks) ✓ · 09-server-sent-events (`streamSSE`) ✓

### 06-paradigms — Paradigms and Architecture
01-programming-paradigms **(quiz)** ✓ · 02-functional-core (pure functions, immutability, composition) ✓ · 03-oop-and-solid (strategy pattern) ✓ · 04-dependency-injection (constructor injection, composition root, fakes) ✓ · 05-layered-architecture (multi-file: routes → service → repository) ✓ · 06-errors-as-values (Result type, domain errors to HTTP) ✓ · 07-design-patterns-for-backends (adapter, decorator, factory) ✓ · 08-architecture-styles **(quiz)** (monolith, modular monolith, microservices, serverless, hexagonal, event-driven) ✓

### 07-data-structures — Data Structures and Algorithms
01-big-o-in-practice **(quiz)** ✓ · 02-maps-and-sets (indexing, grouping, deduplication) ✓ · 03-stacks-and-queues ✓ · 04-linked-lists ✓ · 05-lru-cache ✓ · 06-trees-and-recursion (flat list to tree, traversal) ✓ · 07-graphs-and-topological-sort (dependency order, cycle detection) ✓ · 08-heaps-and-priority-queues ✓ · 09-sorting-and-binary-search ✓

### 08-persistence — Data and Persistence
01-choosing-a-database **(quiz)** (relational, document, key-value, search, vector) ✓ · 02-sql-essentials **(quiz)** (SELECT, JOIN, GROUP BY, indexes) ✓ · 03-parameterized-queries (query builder, SQL injection) ✓ · 04-repository-pattern ✓ · 05-transactions-and-consistency (unit of work with rollback) ✓ · 06-n-plus-one-and-batching (DataLoader-style batching) ✓ · 07-orms-and-migrations **(quiz)** (Prisma, Drizzle, Kysely, TypeORM, migrations) ✓ · 08-caching-strategies (cache-aside, TTL, in-flight deduplication, invalidation) ✓

### 09-security — Authentication and Security
01-authentication-concepts **(quiz)** (sessions vs tokens, cookies, OAuth 2 and OIDC, auth providers) ✓ · 02-password-hashing (salted PBKDF2, constant-time comparison) ✓ · 03-jwt-from-scratch (HS256 sign and verify, expiry) ✓ · 04-authorization-middleware (bearer auth and roles in Hono) ✓ · 05-rate-limiting (fixed window and token bucket) ✓ · 06-owasp-api-security **(quiz)** (OWASP API Top 10, secrets, headers, CORS) ✓

### 10-scaling — Performance, Jobs and Scale
01-keeping-the-event-loop-free (chunking CPU work, measuring lag) ✓ · 02-background-jobs-and-queues (job queue with retries and concurrency) ✓ · 03-worker-threads-and-clustering **(quiz)** ✓ · 04-real-time-transports **(quiz)** (polling, SSE, WebSockets, managed services) ✓ · 05-observability (structured logs, request ids, metrics) ✓ · 06-graceful-shutdown (SIGTERM, draining requests) ✓

### 11-typescript — TypeScript on the Server
01-running-typescript-in-node **(quiz)** (type stripping, tsx, tsc, `module: nodenext`) ✓ · 02-typed-config-with-zod ✓ · 03-end-to-end-type-safety (shared Zod schemas, Hono RPC client) ✓

### 12-shipping — Testing, Shipping and Building with AI
01-testing-backend-code **(quiz)** (unit vs integration, test doubles, Vitest, `node:test`, Supertest, Testcontainers) ✓ · 02-configuration-and-twelve-factor **(quiz)** ✓ · 03-deployment-options **(quiz)** (VPS, containers, PaaS, serverless, edge) ✓ · 04-building-backends-with-ai **(quiz)** (briefing, review checklist, decision matrix) ✓ · 05-capstone-api (multi-file Hono API: validation, service, repository, auth, errors) ✓
