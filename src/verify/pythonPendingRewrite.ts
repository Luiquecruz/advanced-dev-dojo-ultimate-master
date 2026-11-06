/**
 * Python lessons not yet rewritten to the no-bridge template (02-content-standards.md), with the rules each one still breaks.
 * The rewrite of a lesson removes its entry in the same change; an entry whose lesson no longer breaks a listed rule fails
 * pythonConventions.test.ts, so the list only shrinks and must be empty when the last rewrite lands.
 */
export const PYTHON_PENDING_REWRITE: Record<string, readonly string[]> = {
  'python/python-map': ['theory-fences', 'no-bridge'],
  'python/stdlib-map': ['theory-no-bridge', 'no-bridge'],
  'python/regular-expressions': ['theory-no-bridge', 'theory-common-mistakes', 'theory-fences', 'no-bridge', 'tests-beginner-mistake'],
  'python/pathlib-and-io': ['theory-no-bridge', 'theory-common-mistakes', 'theory-fences', 'no-bridge', 'tests-beginner-mistake'],
  'python/numbers-decimal-and-fractions': ['theory-no-bridge', 'theory-common-mistakes', 'theory-fences', 'no-bridge', 'tests-beginner-mistake'],
  'python/dates-and-times': ['theory-no-bridge', 'theory-common-mistakes', 'theory-fences', 'no-bridge', 'tests-beginner-mistake'],
  'python/json-and-serialization': ['theory-no-bridge', 'theory-common-mistakes', 'theory-fences', 'no-bridge', 'tests-beginner-mistake'],
  'python/enums': ['theory-no-bridge', 'theory-common-mistakes', 'theory-fences', 'no-bridge', 'tests-beginner-mistake'],
  'python/logging': ['theory-no-bridge', 'theory-common-mistakes', 'theory-fences', 'no-bridge', 'tests-beginner-mistake'],
  'python/argparse-and-cli': ['theory-no-bridge', 'theory-common-mistakes', 'theory-fences', 'no-bridge', 'tests-beginner-mistake'],
  'python/stdlib-adr': ['no-bridge'],
  'python/matching-map': ['theory-no-bridge', 'theory-fences', 'no-bridge'],
  'python/sequence-and-mapping-patterns': ['theory-no-bridge', 'theory-common-mistakes', 'theory-fences', 'no-bridge', 'tests-beginner-mistake'],
  'python/class-patterns': ['theory-no-bridge', 'theory-common-mistakes', 'theory-fences', 'no-bridge', 'tests-beginner-mistake'],
  'python/guards-or-and-capture': ['theory-no-bridge', 'theory-common-mistakes', 'theory-fences', 'no-bridge', 'tests-beginner-mistake'],
  'python/walrus-and-loop-else': ['theory-no-bridge', 'theory-common-mistakes', 'theory-fences', 'no-bridge', 'tests-beginner-mistake'],
  'python/typing-map': ['theory-no-bridge', 'no-bridge'],
  'python/modern-annotation-syntax': ['theory-no-bridge', 'theory-common-mistakes', 'theory-fences', 'no-bridge', 'tests-beginner-mistake'],
  'python/generics-pep-695': ['theory-no-bridge', 'theory-common-mistakes', 'theory-fences', 'no-bridge', 'tests-beginner-mistake'],
  'python/protocols': ['theory-no-bridge', 'theory-common-mistakes', 'theory-fences', 'no-bridge', 'tests-beginner-mistake'],
  'python/typeddict-and-literals': ['theory-no-bridge', 'theory-common-mistakes', 'theory-fences', 'no-bridge', 'tests-beginner-mistake'],
  'python/overloads-and-narrowing': ['theory-no-bridge', 'theory-common-mistakes', 'theory-fences', 'no-bridge', 'tests-beginner-mistake'],
  'python/runtime-annotations': ['theory-no-bridge', 'theory-common-mistakes', 'theory-fences', 'no-bridge', 'tests-beginner-mistake'],
  'python/typing-evolution-and-checkers': ['no-bridge'],
  'python/typing-adr': ['no-bridge'],
  'python/async-map': ['theory-no-bridge', 'theory-fences', 'no-bridge'],
  'python/event-loop-mental-model': ['theory-no-bridge', 'theory-common-mistakes', 'theory-fences', 'no-bridge', 'tests-beginner-mistake'],
  'python/async-iterators-and-context': ['theory-no-bridge', 'theory-common-mistakes', 'theory-fences', 'no-bridge', 'tests-beginner-mistake'],
  'python/tasks-and-gather': ['theory-no-bridge', 'theory-common-mistakes', 'theory-fences', 'no-bridge', 'tests-beginner-mistake'],
  'python/task-groups': ['theory-no-bridge', 'theory-common-mistakes', 'theory-fences', 'no-bridge', 'tests-beginner-mistake'],
  'python/timeouts-and-cancellation': ['theory-no-bridge', 'theory-common-mistakes', 'theory-fences', 'no-bridge', 'tests-beginner-mistake'],
  'python/queues-locks-semaphores': ['theory-no-bridge', 'theory-common-mistakes', 'theory-fences', 'no-bridge', 'tests-beginner-mistake'],
  'python/blocking-threads-and-the-gil': ['theory-no-bridge', 'theory-fences', 'no-bridge'],
  'python/metaprogramming-map': ['theory-no-bridge', 'no-bridge'],
  'python/init-subclass-registries': ['theory-no-bridge', 'theory-common-mistakes', 'theory-fences', 'no-bridge', 'tests-beginner-mistake'],
  'python/dynamic-classes': ['theory-no-bridge', 'theory-common-mistakes', 'theory-fences', 'no-bridge', 'tests-beginner-mistake'],
  'python/attribute-hooks': ['theory-no-bridge', 'theory-common-mistakes', 'theory-fences', 'no-bridge', 'tests-beginner-mistake'],
  'python/metaclasses': ['theory-no-bridge', 'theory-common-mistakes', 'theory-fences', 'no-bridge', 'tests-beginner-mistake'],
  'python/inspect-and-signatures': ['theory-no-bridge', 'theory-common-mistakes', 'theory-fences', 'no-bridge', 'tests-beginner-mistake'],
  'python/import-system-internals': ['theory-no-bridge', 'theory-common-mistakes', 'theory-fences', 'no-bridge', 'resources-host', 'tests-beginner-mistake'],
  'python/frames-and-tracebacks': ['theory-no-bridge', 'theory-common-mistakes', 'theory-fences', 'no-bridge', 'tests-beginner-mistake'],
  'python/bytecode-and-the-interpreter': ['theory-no-bridge', 'no-bridge'],
  'python/tooling-map': ['theory-no-bridge', 'no-bridge'],
  'python/packaging-and-environments': ['theory-no-bridge', 'theory-fences', 'no-bridge'],
  'python/environments-and-venv': ['theory-no-bridge', 'theory-common-mistakes', 'theory-fences', 'no-bridge', 'resources-host', 'tests-beginner-mistake'],
  'python/testing-with-unittest': ['theory-no-bridge', 'theory-common-mistakes', 'theory-fences', 'no-bridge', 'resources-host', 'tests-beginner-mistake'],
  'python/capstone-async-rules-engine': ['theory-no-bridge', 'theory-common-mistakes', 'theory-fences', 'no-bridge', 'tests-beginner-mistake'],
  'python/validation-map': ['theory-no-bridge', 'no-bridge', 'resources-host'],
  'python/basemodel-vs-dataclass': ['theory-no-bridge', 'theory-common-mistakes', 'theory-fences', 'no-bridge', 'resources-host', 'tests-beginner-mistake'],
  'python/lax-and-strict-modes': ['theory-no-bridge', 'theory-common-mistakes', 'theory-fences', 'no-bridge', 'resources-host', 'tests-beginner-mistake'],
  'python/field-and-model-validators': ['theory-no-bridge', 'theory-common-mistakes', 'theory-fences', 'no-bridge', 'tests-beginner-mistake'],
  'python/serialization-and-json-schema': ['theory-no-bridge', 'theory-common-mistakes', 'no-bridge', 'resources-host', 'tests-beginner-mistake'],
  'python/pydantic-core-and-performance': ['theory-no-bridge', 'no-bridge'],
  'python/validation-adr': ['theory-no-bridge', 'no-bridge'],
};

/**
 * Track and module texts (`track.json` and `module.json` titles and descriptions) that still compare with another language, keyed
 * `track:<track id>` or `module:<track id>/<module id>`. The same rules as above: fix the text, remove the entry, and a stale entry fails.
 */
export const PYTHON_PENDING_HEADERS: Record<string, readonly string[]> = {
  'track:python': ['no-bridge'],
  'module:python/stdlib': ['no-bridge'],
  'module:python/typing': ['no-bridge'],
  'module:python/validation': ['no-bridge'],
};
