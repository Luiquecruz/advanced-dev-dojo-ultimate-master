# State Management track

The public track is titled State Management and retains its `react-state` route and existing React lesson keys. It centralizes state architecture and framework-specific tools, including the Angular state lessons formerly inside the Angular track. The track has 30 lessons across six required modules.

## Learning paths

| Modules | Focus | Prerequisites |
| --- | --- | --- |
| 01–04 | State ownership and React implementations: local state, reducers, immutable updates, Context, external stores and server caches | React components and hooks |
| 05 State with Angular | Signal-based services, NgRx SignalStore, store features and classic NgRx Store | Angular signals and dependency injection; exact prerequisite titles appear in each lesson |
| 06 Architecture and Decision Making | Tool selection across React and Angular, state boundaries, React forms and compiler considerations, and a React capstone | The framework-specific path used by the exercise |

Angular learners can begin at module 05 after the Angular prerequisites. React hooks, JSX and React libraries are not prerequisites for the Angular exercises. The ownership questions transfer between frameworks; their concrete APIs do not. The decision lesson explicitly distinguishes the React examples from Angular signal services, SignalStore and classic Store.

## Content and verification

`track.json` declares `languages: ["react", "angular"]`. These are framework entries in the existing language registry. Each lesson ships the framework it teaches, using `variants/react` or `variants/angular`, while theory, concepts and optional quizzes remain at the lesson root. The loader already offers only variants that exist and selects their engine, so no loader or sandbox behavior is added.

The `react-state` verify suite runs every React challenge with the React adapter and every Angular challenge with the Angular adapter. A solution must pass all tests and a starter must fail at least one. Existing React lesson keys preserve completed lessons, quiz answers and resume pointers. A bounded progress migration moves legacy React editor drafts into the `#react` namespace and retains newer drafts and Angular passes.

Angular framework fundamentals remain in the Angular track; its publication and numbering cleanup are handled separately. The Java/Spring track remains independent, and full-stack integration is deferred.
