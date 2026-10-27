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
01-standard-decorators ✓ · 02-legacy-experimental-decorators **(quiz)** ✓ · 03-branded-types ✓ · 04-type-safe-event-emitter ✓ · 05-type-safe-builder · 06-dependency-injection-container

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
