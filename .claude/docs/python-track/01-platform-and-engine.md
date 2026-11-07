# Phase 1 — Platform and Engine

The Python engine already exists (Pyodide in a Web Worker, `dojo_harness.py`, `browserClient.ts`, `pythonGrader()`), but today Python only appears as a *language* of multi-language tracks. The loader already supports `"engine": "python"` (`DEFAULT_ENTRY.python = main.py`, python is a headless engine, so no preview). This phase makes it a track.

## Tasks

| # | Task | File |
| --- | --- | --- |
| 1 | Track metadata | `src/content/python/track.json` |
| 2 | Accent rule | `src/shared/design/tokens.css` |
| 3 | Verification suite | `src/verify/python.test.ts` |
| 4 | Curriculum doc section | `.claude/docs/CURRICULUM.md` |
| 5 | Engine doc update | `.claude/docs/CONTENT_GUIDE.md`, `.claude/docs/ARCHITECTURE.md` |
| 6 | Site copy | `index.html` meta description |
| 7 | Project docs table | `.claude/CLAUDE.md` (row for this folder) |

### 1. `track.json`

The file as it stands. Its description names no other language ([02-content-standards.md](02-content-standards.md) "No bridges"; `pythonConventions.test.ts` checks `track.json` and every `module.json`).

```json
{
  "engine": "python",
  "order": 9,
  "title": "Python",
  "monogram": "PY",
  "description": "Python 3.14 from the first program to production code: an optional foundations module for people who have never programmed, then the object model, functions and closures, classes and descriptors, iterators, context managers, the standard library, pattern matching, type hints, asyncio, metaprogramming, tooling and Pydantic validation, with when-to-choose guidance for every feature.",
  "version": "Python 3.14"
}
```

`order: 9` places it after AI Engineering (8). `shortTitle` is not needed. Check the home backdrop word and the carousel with a 9-track list.

### 2. Accent

Add to `tokens.css`, after the `node` rule:

```css
[data-trail='python'] {
  --accent: #ffef73;
  --accent-rgb: 255 239 115;
}
```

Hue 53°, the yellow of the Python logo (it began at 123° green, and the accents were respaced when Java and Spring Boot was published): at least 30° from `architecture` (22°) and from `java-spring` (94°). `trackPresentation.test.ts` enforces contrast (AA on `void`, `panel`, `elevated`, and under `on-accent`) and the 30° distance. If the test rejects the exact value, adjust lightness only, keeping the hue between 122° and 124°. Add the row to the accent table in `ARCHITECTURE.md` (python, `#62e869`, 123°) and update the sentence "no band 30° away from every accent is left": after this track, none remains.

### 3. Verification suite

```ts
import { defineChallengeSuite } from './challengeSuite';
import { pythonGrader } from './graders';

defineChallengeSuite('python', pythonGrader());
```

`language` stays undefined (single-language track). `challengeSuite.ts` filters variants whose `language` equals the argument, and for a single-language track `variant.language` is `undefined`, so the call without a language works.

A second check runs outside Pyodide: `tests/python` (pytest, CPython 3.14, a CI job) grades the Python challenges with the same `dojo_harness.py` (lessons that use the fake model `dojo_ai` are skipped: it runs only in Pyodide) in a fresh `python -s -P` child (hash seed 0, like Pyodide), with temporary `DOJO_APP_DIRECTORY` and `DOJO_SCRATCH_DIRECTORIES` (the harness deletes new files in its scratch directories). Details in CONTRIBUTING.md "Python on CPython".

### 4–7. Docs and copy

- `CURRICULUM.md`: new `## Python (src/content/python)` section generated from [03-curriculum.md](03-curriculum.md); written lessons carry `✓`.
- `CONTENT_GUIDE.md` "Python engine": replace "Python is offered as a language of multi-language tracks, never as a track engine on its own" with the single-language rules (files at the lesson root: `starter/`, `solution/`, `tests.py`; `entry` default `main.py`; `run` names `demo.py`). Add the list of Python-track conventions from [02-content-standards.md](02-content-standards.md).
- `ARCHITECTURE.md`: the accent table, and one sentence under "Adding a track" that a track on the Python engine needs no UI code.
- `index.html`: add "Python" to the meta description list.
- `.claude/CLAUDE.md`: add the row `.claude/docs/python-track/` to the documentation table ("Read before: writing or planning Python lessons").

## Things to verify (do not assume)

1. `npm run typecheck`, `npm run test`, `npm run build` stay green with `src/content/python/track.json` present and zero lessons. `content.test.ts` may require every track to have lessons: if so, add the module and first lesson in the same change as the track.
2. The track works with `"engine": "python"` end to end: catalog entry in `virtual:dojo-content`, lesson chunk, `LessonPage` uses `challenge.engine`, Run button appears (`RUNNABLE_ENGINES` contains python), Monaco highlights `.py`.
3. `LessonPage.tsx:26` and `loader.ts:106` read `track.engine`: confirm they behave for a Python single-language track (no preview panel, console shown).
4. Pyodide startup (about 12 MB first run) is acceptable as the *only* engine of a track; check `warmUpPython()` fires when the lesson opens, not only on first Run.
5. Progress keys: single-language progress uses lesson keys without a language suffix; confirm `codeKeyFor` with `language` undefined.
6. Home carousel with 9 tracks and `?debug=perf`: no layout break, progress segments, `data-trail="python"` scene tint.

## Risks

| Risk | Mitigation |
| --- | --- |
| Pyodide features missing: threads, `multiprocessing`, `socket`, `subprocess`, `zoneinfo` data, real `venv` | Standards doc lists what to avoid; those topics become theory/quiz or use injected dependencies |
| `asyncio` inside the harness: tests are coroutines awaited with a 4 s timeout | Keep async tests short; no real sleeping beyond 50 ms; verify `TaskGroup`, `asyncio.timeout`, `Queue` in Pyodide before writing lessons |
| Pydantic wheels not bundled in the npm `pyodide` package | Phase 5 spike, see 08 |
| Accent too close to Node/Vue visually | Monogram and title are the second cue; revisit the 30° rule when a tenth track arrives |
