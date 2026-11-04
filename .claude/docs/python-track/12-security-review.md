# Python Track — Security Review

Date: 2026-11-04. Scope: lessons written so far (`src/content/python/01-object-model`, `02-collections`), planned lessons in specs 05–08, the Python engine (`src/engines/python/*`, `runtime/dojo_harness.py`), the Node grader (`src/verify/graders.ts`), `plugins/pyodidePlugin.ts`, and the Pyodide/Pydantic supply chain.

Findings marked **[verified]** were reproduced locally (Node 26.10, `pyodide@314.0.7`). Findings marked **[inferred]** follow from code reading and Pyodide FFI semantics but were not run in a browser.

## Threat model

- There is no backend and no code sharing: learner code is typed by the learner and stored in their own `localStorage` (`entities/progress/progressStore.ts:21,36`). Routes carry only `/<track>/<lesson>` (react-router path routes since November 2026; hash routes before), never code. So learner code attacking the platform is mostly self-harm (self-XSS class), and grading integrity is a local concern.
- Lesson content (`starter/`, `solution/`, `tests.py`, Markdown) is trusted repository content, but it **executes on contributor and CI machines** through `npm run verify`. That is the one place where a malicious contribution has real impact (see B1).
- The realistic secondary vector is a learner pasting code from the internet into the editor.

## Summary

| ID | Area | Severity | Finding |
| --- | --- | --- | --- |
| B1 | Platform | **High** | `npm run verify` runs lesson Python with full host access (`fs`, `child_process`, `process.env`) through `import js` |
| B2 | Platform | Medium | Interpreter state (builtins, stdlib modules, `dojo_harness`) leaks between runs and lessons; grading can be poisoned |
| B3 | Platform | Medium | Worker has unrestricted network (`js.fetch`, `pyfetch`, `WebSocket`, `loadPackage(url)`) |
| B4 | Platform | Medium | A JS-side exception in the worker never answers; the UI waits 45–75 s |
| C1 | Supply chain | Medium | Spec 08 spike omits `typing-inspection`; wheels need a pinned, hash-checked vendoring step |
| A1 | Content | Medium | `normalize_key` is presented as fit for "user-facing identifiers" without the NFKC/confusables caveat |
| B5 | Platform | Low | Learner code can forge worker responses (`js.postMessage`) and mark tests as passed |
| B6 | Platform | Low | Unbounded output size (single huge `print`, `capture_output` buffer) |
| B7 | Platform | Low | `write_project` does not confine file names to `/app` |
| B8 | Platform | Low | No CSP; Markdown is rendered with `dangerouslySetInnerHTML` without sanitizing (trusted content only) |
| C2 | Supply chain | Low | Pyodide (MPL-2.0) and vendored wheels need license notices in the build |

Confirmed good: Pyodide is served from the app origin in the browser, learner output is rendered as text, timeouts terminate the worker, `pyodide` is pinned exactly with a lockfile integrity hash.

---

## A. Content teaching risk

### A.1 Written lessons (modules 01–02)

A scan for `eval`/`exec`, `pickle`, `marshal`, `subprocess`, `shell=True`, `yaml.load`, bare `except:`, `except Exception: pass`, secrets, network calls, mutable default parameters and catastrophic regex patterns found **no insecure habit modelled** in `src/content/python`. Positive patterns already taught:

- `05-shallow-vs-deep-copy` teaches the shared-mutable-defaults leak explicitly (`theory.md:44`, test `tests.py:35`).
- `08-text-and-bytes/theory.md:25` warns that `errors="ignore"`/`"replace"` lose data silently and that `latin-1` "never fails"; `theory.md:15` recommends explicit `encoding=`.
- Exceptions are caught by specific type (`06-identity-equality-and-interning/starter/demo.py:10`, `08-text-and-bytes/solution/main.py` catches `UnicodeDecodeError` only).

**A1 (Medium) — identifier normalization.** `02-collections/08-text-and-bytes/theory.md:60` recommends "`casefold()` and NFC normalization for user-facing identifiers", and `challenge.md:13` calls the result "appearance-insensitive". NFC + `casefold()` does not fold compatibility characters (fullwidth `ｆ`, ligature `ﬁ`, superscripts) nor confusables (Cyrillic `а` vs Latin `a`), so two usernames that look identical can still be distinct keys (account spoofing). Fix (theory only, no test change needed): add a short Security note: for login/username identifiers use NFKC + casefold (or PRECIS, RFC 8264 / Python `unicodedata.normalize("NFKC", s).casefold()`), and check confusables per Unicode UTS #39; NFC + casefold is right for search keys and display matching. Also reword "appearance-insensitive" to "case- and composition-insensitive".

**A2 (Low) — hash randomization.** `01-object-model/03-mutability-and-hashing` teaches `__hash__` but not that `str`/`bytes` hashes are salted per process (`PYTHONHASHSEED`) as a defence against hash-flooding DoS. Add one line plus a quiz option: never persist or transmit `hash()` values; use `hashlib` for stable digests.

### A.2 Security points for planned lessons

Each item is a short **Security note** section in `theory.md` and, where testable, a test or a quiz question. Lesson ids follow specs 06 and 07.

**Module 07-stdlib** (`06-modules-05-to-08.md:110-166`)

| Lesson | Security note | Test / quiz |
| --- | --- | --- |
| `01-stdlib-map` | Map row "dangerous by design": `pickle`/`marshal`/`shelve` (code execution on load), `eval`, `subprocess(shell=True)`, `yaml.load` (third party), `xml.etree` on untrusted input (prefer `defusedxml`). | Quiz: "Which of these is safe to call on bytes from an HTTP request?" (`json.loads` correct; `pickle.loads` wrong). |
| `02-json-and-serialization` | `json` is the safe default for untrusted data; `pickle.loads` runs arbitrary code via `__reduce__` (JS has no equivalent: `JSON.parse` never executes code). `parse_constant` to reject `NaN`/`Infinity`, which other JSON parsers refuse. Limit input size before `loads`. Never `eval` JSON-like text. | Test: `loads_with_decimals("NaN")` behaviour documented, or a quiz on `pickle` vs `json` for a cross-team payload. Keep `pickle` out of every challenge. |
| `03-regular-expressions` | ReDoS: nested quantifiers like `(a+)+$` or `(\w+\s?)*$` backtrack exponentially; Python's `re` has no timeout. Bound input length, avoid nested quantifiers, prefer `fullmatch` with simple classes. Python 3.11+ atomic groups `(?>...)` and possessive quantifiers `a++` help. Email masking: do not claim a regex validates emails. | Test: `parse_log_line("a" * 50_000 + "!")` returns `None` well within the 4 s test timeout (guards against a learner writing a catastrophic pattern). Quiz: identify the vulnerable pattern. |
| `04-pathlib-and-io` | Path traversal: `base / user_part` with `"../"` or an absolute `user_part` escapes `base` (`Path("/srv") / "/etc/passwd"` is `/etc/passwd`). Resolve and check `resolved.is_relative_to(base.resolve())`. `tempfile.mkstemp`/`TemporaryDirectory` instead of predictable `/tmp` names (spec's `/tmp/dojo-<unique>` is fine in the in-memory FS but say why it matters on real hosts). | Add a function to the challenge, e.g. `safe_join(base, name)` raising `ValueError` on escape; tests with `"../x"`, `"/etc/passwd"`, `"a/../../x"`. |
| `05-numbers-decimal-and-fractions` | `int("9" * 10**6)` is capped (CVE-2020-10735, `sys.set_int_max_str_digits`, default 4300 digits) to stop quadratic-time DoS; `Fraction(text)`/`Decimal(text)` on untrusted input should be length-checked. | Quiz on the int-to-str digit limit. |
| `06-dates-and-times` | Parse with an explicit format or `fromisoformat` and reject naive input (already in spec). | None beyond the spec. |
| `08-logging` | Never log secrets, tokens or full request bodies; redact with a `logging.Filter`. Log injection: user text containing `\n` forges extra log lines; escape or use structured output. Lazy `%` formatting (`logger.info("user %s", name)`), never `logger.info(user_text)` as the format string (a `%` in user text breaks or misformats it). | Test: `log_event(logger, "login", password="x")` output does not contain `"x"` (redacting filter), and a field with `"\n"` stays on one line. |
| `09-argparse-and-cli` | Do not pass secrets as CLI flags (visible in `ps`, shell history); read from env or a file. If the CLI shells out, use `subprocess.run([...])` with a list, never `shell=True` with user text (`shlex.quote` only as last resort). | Quiz on `shell=True` injection. |
| `10-stdlib-adr` | Coherence rule already excludes `pickle` for cross-team JSON; add `security` to the consequences and require the ADR to mention untrusted input in `context`. | Coherence test: `serialization == "pickle"` fails with a message naming code execution. |

**Module 06-context-and-errors** (same spec)

| Lesson | Security note |
| --- | --- |
| `04-suppressing-and-handling-in-exit`, `06-exception-hierarchies` | Swallowing exceptions (`except Exception: pass`, `__exit__` returning `True` unconditionally, `contextlib.suppress(Exception)`) hides security failures; never catch `BaseException` outside top-level runners. Error messages shown to users must not include secrets or internal paths. Test: `__exit__` suppresses only the declared exception type. |

**Module 11-metaprogramming** (`07-modules-09-to-12.md:120-167`)

| Lesson | Security note | Test / quiz |
| --- | --- | --- |
| `01-metaprogramming-map` | `eval`/`exec`/`compile` on strings is the most dangerous hook; `ast.literal_eval` for literal data only (still bound the input size: deeply nested input can exhaust the parser). Dunder access (`().__class__.__base__.__subclasses__()`) defeats "restricted" `eval` with stripped builtins: there is no safe Python sandbox in-process. | Quiz: "Does `eval(text, {"__builtins__": {}})` make `eval` safe?" (no). |
| `02-init-subclass-registries` | Import-time registration runs code from every imported module; plugin discovery equals code execution. | — |
| `03-dynamic-classes` | `make_record_class(name, fields)`: validate field names with `str.isidentifier()` and `keyword.iskeyword()`; never build classes by `exec` of templated source (the `namedtuple` history). | Test: a field named `"__class__"` or `"x; import os"` raises `ValueError`. |
| `04-attribute-hooks` | `Proxy` forwarding everything exposes private/dunder attributes of the target; forward an allow-list. `Frozen` is not a security boundary (`object.__setattr__` bypasses it). | Test: `Proxy` does not forward `_private` names (if the spec accepts the change). Quiz on `object.__setattr__` bypass. |
| `06-inspect-and-signatures` | `call_with` dependency injection must not inject by arbitrary user-supplied names. | — |
| `07-frames-and-tracebacks` | `f_locals` and full tracebacks leak secrets (passwords in locals) into logs and error pages; `traceback.TracebackException(..., capture_locals=False)` default; don't render tracebacks to end users. | Quiz. |
| `09-metaprogramming-adr` | Add `entry_points` trade-off: any installed distribution can register a plugin (supply-chain surface). | Coherence: choosing `entry_points` requires a `trust` note. |

**Module 12-tooling** (`07-modules-09-to-12.md:169-207`)

| Lesson | Security note | Test / quiz |
| --- | --- | --- |
| `02-pyproject-toml` | Version specifiers vs pins: libraries declare ranges, applications lock. `[build-system]` requirements run arbitrary code at build time (sdist builds). | Quiz. |
| `03-environments-and-venv` | `resolve_command` PATH shadowing is the venv mechanism **and** an attack (a writable directory early in `PATH`, `.` in `PATH`). | Test already planned ("PATH shadowing"); add one asserting a relative/empty `PATH` entry is ignored, if the spec accepts it. |
| `04-uv-and-lockfiles` | Lockfiles with hashes (`uv.lock`, `pip install --require-hashes -r requirements.txt`, `pip-compile --generate-hashes`); hash mode fails closed on any unpinned or unhashed dependency. Dependency confusion: `--extra-index-url` mixes indexes and lets a public package shadow an internal name; prefer a single index or uv's index pinning (`[tool.uv.sources]`, `explicit = true`). Typosquatting. | Quiz: what `--require-hashes` guarantees and what it does not (it verifies artifacts, not that the code is benign). |
| `05-modules-and-the-import-system` | `sys.meta_path` finders and `.pth` files execute code at startup; a writable `site-packages` or a module named like a stdlib module in the script directory (`json.py`) shadows the real one (`python -I`, `safe_path`, PEP 704-era `-P` flag). | Test: `DictFinder` does not serve names outside its dict; quiz on script-directory shadowing. |
| `06-testing-pytest-and-unittest` | `pip-audit`/`osv-scanner` in CI; tests must not read real secrets. | — |
| `07-linting-formatting-and-checkers` | Ruff's `S` rules (flake8-bandit) and Bandit flag `eval`, `pickle`, `shell=True`, `yaml.load`, `assert` used for authorization (stripped by `-O`). | Quiz: which rule catches `subprocess.run(cmd, shell=True)`. |
| `08-wheels-and-distribution` | Prefer wheels (no code at install) over sdists (build backend runs); PyPI trusted publishing (OIDC, no long-lived API tokens), PEP 740 attestations / Sigstore, 2FA, yanking. Dated facts with sources. | Quiz on trusted publishing vs API tokens. |

**Module 13-validation** (spec 08): validate at the edge, reject unknown fields (`model_config = ConfigDict(extra="forbid")`), size limits before parsing, never echo `ValidationError` input values containing secrets back to clients (`errors(include_input=False)`). Add a test for `extra="forbid"` in `02-basemodel-vs-dataclass`.

### A.3 Where an explicit security ADR belongs

1. **Platform ADR** (decision record, not a lesson): a new section "Python sandbox threat model" in `.claude/docs/ARCHITECTURE.md`, next to the "Multi-language challenges" section, recording the threat model above, the decisions for B1–B4 and the Pydantic vendoring decision (spec 08 already says to record it there).
2. **Learner ADR checkpoint**: add a dedicated lesson `12-tooling/09-supply-chain-adr` (A, Ad) before the capstone (capstone moves to `10-`). Briefing: a service with 40 dependencies, an internal package index, CI publishing to PyPI. `PLAN`: `locking` (`hashed_lockfile`|`ranges`|`none`), `index` (`single`|`extra_index_url`), `publishing` (`trusted_publishing`|`api_token`), `audit` (`ci`|`manual`|`none`), `install_from` (`wheels_only`|`sdist_allowed`), `rejected`. Coherence: an internal index forbids `extra_index_url`; CI publishing requires `trusted_publishing`; `none` locking is rejected. Update `03-curriculum.md` and `CURRICULUM.md` together (the curriculum test enforces `✓`).
3. The existing `07-stdlib/10-stdlib-adr` keeps its `pickle` coherence rule; it is the natural place for the untrusted-input decision in serialization.

---

## B. Platform risk

### What is already sound

- **Same-origin runtime, no CDN in the browser.** `plugins/pyodidePlugin.ts:6-11` allow-lists four runtime files, the dev middleware serves only those names (`:28-37`, so no path traversal through `request.url`), and the build copies them (`:39-43`). The worker sets `indexURL` to `<base>pyodide/` (`src/engines/python/python.worker.ts:5,14`). Pyodide uses its jsDelivr `cdnUrl` only in Node (`node_modules/pyodide/pyodide.asm.mjs`, the `IN_NODE` branch sets `cdnURL`; the browser branch uses `packageBaseUrl` only, which defaults to the lock file directory, i.e. our origin). [verified by reading the bundled source]
- **Learner output is rendered as text.** Test messages and compile errors go into `<pre>{...}</pre>` (`src/features/lesson/LessonPanel.tsx:176,188`), console lines into `{entry.text}` (`src/pages/lesson/LessonPage.tsx:242`), test names through `TestName` which builds React nodes, not HTML (`src/features/lesson/TestName.tsx:4-9`). No XSS from learner-produced strings. `RunReport` crosses `postMessage` via structured clone, so no prototype pollution through `__proto__` keys.
- **Loop and hang guards.** The main thread terminates the worker on timeout: tests 45 s, run 15 s, plus 30 s on first start (`src/engines/python/browserClient.ts:6-8,54-57`, `stopWorker` at `:20-24`). Async tests have a per-test 4 s `asyncio.wait_for` (`runtime/dojo_harness.py:18,247`). A synchronous infinite loop blocks the worker, so only the outer terminate catches it; that is correct (there is no `setInterruptBuffer`, which would need `SharedArrayBuffer` and cross-origin isolation).
- **Worker isolation from app storage.** The worker cannot touch `localStorage` (not exposed to workers), so learner code cannot read or rewrite progress. Memory is bounded by the wasm32 heap; allocation failure raises `MemoryError` or aborts the instance, and the worker is replaced on the next timeout.
- **Pinning.** `package.json:50` pins `"pyodide": "314.0.7"` exactly; `package-lock.json:4401-4405` records the tarball `sha512` integrity.

### Findings

**B1 — High — `npm run verify` gives lesson code full host access.** [verified] `src/verify/graders.ts:40-53` loads Pyodide in Node and runs lesson code in the same process. Through the FFI, `import js` is Node's `globalThis`: `js.process.env` returns the developer's environment (`HOME` printed in the probe), and `js.process.getBuiltinModule("fs")` / `("child_process").execSync` are reachable. A malicious or careless lesson contribution (solution, starter or `tests.py`) therefore executes arbitrary commands on contributor laptops and CI runners and can read CI secrets. There is also no timeout around `engine.runTests` in Node; a synchronous infinite loop blocks the Vitest worker thread. *Minimal fix:* before running lesson code in `createPythonEngine` when in Node, run a bootstrap that removes the bridge: `pyodide.runPython("import sys; sys.modules['js'] = None; sys.modules['pyodide_js'] = None")` is not enough on its own (`pyodide.ffi` and `_pyodide` still reach JS), so prefer running each verify grader in a `node:worker_threads` Worker with `env: {}` (`SHARE_ENV` off) and `resourceLimits`, terminating it on a per-lesson timeout; in CI, run `verify` with no secrets in the job environment and without network. Track the stricter option (Node permission model, `node --permission --allow-fs-read=<repo>`) as a follow-up. The same review should be applied to the Node.js and TypeScript engines' verify paths [inferred: not checked here].

**B2 — Medium — State leaks between runs and lessons.** [verified in Node] One Pyodide instance serves every run in the session (`browserClient.ts:15` creates the worker once; `graders.ts:40-46` loads once per suite). `unload_project` (`dojo_harness.py:101-106`) removes only modules named after the project files. Learner code can patch `builtins` (the probe set `builtins.len` and it stayed patched in the next `runPython`), replace stdlib modules in `sys.modules`, monkeypatch `dojo_harness` itself (e.g. `describe_error`, `run_tests`), or leave `sys.stdout` replaced. Effects: a later lesson's tests pass or fail for reasons unrelated to its code, in the browser and in `npm run verify`. `run_program` restores `asyncio.run` (`:292`) but nothing else. *Minimal fix:* at engine creation snapshot `set(sys.modules)` and `dict(builtins.__dict__)`; after each `run_tests`/`run_program` delete modules not in the snapshot, restore the builtins dict and `sys.stdout`/`sys.stderr`, and reset `sys.path` to its snapshot. For verify, a fresh instance per lesson is cheap enough to consider. Full isolation from a deliberately hostile learner is not achievable in-process and not required (threat model).

**B3 — Medium — Unrestricted network from the worker.** [inferred] Learner code can call `js.fetch`, `pyodide.http.pyfetch`, `js.WebSocket`, or `pyodide_js.loadPackage("https://…/any.whl")` (absolute URLs bypass the lock file) to any origin that allows CORS, and same-origin requests carry cookies. Impact today is limited (no backend, no secrets in the origin), but it contradicts the content rule "never call real models" and lets pasted snippets beacon out. There is no CSP anywhere (`index.html`, `sandbox.html`). *Minimal fix:* after `loadPyodide` and any package preload in `python.worker.ts`, delete the network globals from the worker scope (`fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `importScripts`), keeping a private reference only if the engine needs it; and serve the worker script with `Content-Security-Policy: connect-src 'self'` from the static host (a `<meta>` CSP in `index.html` does not apply to workers).

**B4 — Medium (availability) — Worker errors outside Python never answer.** `python.worker.ts:31-38` awaits `runTests`/`runProgram` without `try/catch`. If Pyodide throws on the JS side (fatal wasm abort after memory exhaustion, a `PythonError` escaping the harness, a `toJs` conversion failure on an odd report), the promise rejects inside `onmessage`, no message is posted, and `browserClient.ts` waits the full timeout (45 s, or 75 s on first run) before showing "took too long". *Minimal fix:* wrap both branches and `post({ type: 'failed', message })` on error; `browserClient.ts:46-49` already terminates and restarts on `failed`.

**B5 — Low — Forged worker responses.** [inferred] `browserClient.ts:45-53` trusts any `message` event from the worker; request ids are sequential (`:13`). Learner code can `js.postMessage(to_js({"type": "test-report", "id": n, "report": {...}}, dict_converter=js.Object.fromEntries))` and mark a challenge as passed. Self-cheating only; accept and document, or move the harness channel to a `MessageChannel` port created before learner code runs and validate the report shape.

**B6 — Low — Unbounded output.** `LessonPage.tsx:17,69` caps the console at 200 entries but not entry length; a single `print("x" * 10**8)` is posted and rendered as one node. `_OutputCapture` (`dojo_harness.py:49-63`) grows without limit during tests. Each `print` line is a separate `postMessage` plus `setState` (`engine.ts:50-51`, `LessonPage.tsx:69`), so a tight print loop floods the main thread for up to 15 s. *Fix:* truncate each entry (e.g. 10 kB) and batch console posts in the worker per animation frame or per 50 ms.

**B7 — Low — File names not confined.** `write_project` (`dojo_harness.py:90-99`) does `os.path.join("/app", name)`; an absolute name or `../` writes anywhere in the in-memory FS (for example over `/dojo/dojo_harness.py` or stdlib files under `/lib`). Names come from lesson folders today (the editor has no add/rename file action), so it is not learner-reachable. *Fix:* `path = os.path.normpath(os.path.join(APP_DIRECTORY, name))` and reject when it does not start with `APP_DIRECTORY + "/"`.

**B8 — Low — HTML rendering of lesson content.** `src/shared/ui/Markdown.tsx:61-62,69-70` renders `marked` output with `dangerouslySetInnerHTML` and no sanitizer; theory, hints, quiz options and explanations can therefore carry raw HTML/script. Only repository content flows there, so this is defence in depth for contributions (pairs with B1). *Fix:* sanitize (DOMPurify) or disable raw HTML in `marked`, and add a CSP with `script-src 'self'` on the static host.

**Note on `describe_assertion`.** `dojo_harness.py:164` `eval`s sub-expressions of the failing `assert`, restricted by `is_safe` (`:129-135`) to builtins from `SAFE_CALLS` and no lambdas/awaits/walrus. Attribute and subscript access can still run learner `__getattr__`/`property`/`__repr__` code, which is already learner code in the same interpreter, so this adds no privilege. The `except Exception: pass` at `:173-174` intentionally drops the diagnostic; acceptable for a harness, but a learner `__repr__` that loops forever stalls the whole suite until the 45 s terminate.

**Out of scope, noted for the team.** The JavaScript sandbox iframe is same-origin and has no `sandbox` attribute (`src/features/lesson/runner.ts:61-67`), so React/Vue/Angular/Node learner code runs with the app origin and can read and rewrite `localStorage` progress. The Python worker is better isolated than that path.

---

## C. Supply chain

**Pyodide pin (OK).** Exact version in `package.json:50`, `sha512` in `package-lock.json:4405`, license `MPL-2.0`. There is no `.github/` CI in the repo; when CI is added, install with `npm ci` (fails on lockfile drift) and keep `pyodide` out of automated range upgrades: a new Pyodide bumps CPython (`pyodide-lock.json` `info`: Python 3.14.2, ABI `2026_0`) and invalidates any vendored wheels.

**C1 — Medium — Pydantic vendoring plan (spec 08 spike).**
- The spike lists four packages (`08-module-13-and-capstone.md:53`), but the pinned lock declares `pydantic 2.12.5` depending on `typing-extensions`, `pydantic_core`, `annotated-types` **and `typing-inspection`**. Vendoring must follow `depends` from `pyodide-lock.json`, not a hand list. Pinned set from the lock:

| Package | Version | Wheel |
| --- | --- | --- |
| pydantic | 2.12.5 | `pydantic-2.12.5-py3-none-any.whl` |
| pydantic-core | 2.41.5 | `pydantic_core-2.41.5-cp314-cp314-pyemscripten_2026_0_wasm32.whl` |
| typing-extensions | 4.15.0 | `typing_extensions-4.15.0-py3-none-any.whl` |
| annotated-types | 0.7.0 | `annotated_types-0.7.0-py3-none-any.whl` |
| typing-inspection | 0.4.2 | `typing_inspection-0.4.2-py3-none-any.whl` |

- These wheels are not in the npm package (`node_modules/pyodide` holds only the runtime). Fetch them once from the Pyodide **314.0.7** release (GitHub release tarball or the versioned jsDelivr path) with a script that verifies each file's SHA-256 against the `sha256` field of `node_modules/pyodide/pyodide-lock.json`, then store them in the repo (or a checked cache) and add their names to `RUNTIME_FILES` in `pyodidePlugin.ts` (or a second allow-list) so dev and build serve them from the app origin.
- Keep `checkIntegrity` at its default `true` when calling `loadPackage` (`node_modules/pyodide/pyodide.d.ts:184-185`; lock entries must carry `sha256`, `:415-418`). Load by **package name** only (`loadPackage(["pydantic"])`), never by URL, so the lock decides version and hash.
- In Node (`npm run verify`) Pyodide falls back to the jsDelivr CDN for packages missing from the local directory (the `IN_NODE` `cdnURL` branch). Make verify fail instead of downloading: point `packageBaseUrl`/`packageCacheDir` at the vendored folder, or check that all five wheels exist before the suite starts.
- Load Pydantic only for module 13 lessons (spike question 3) and before stripping network globals (B3).

**C2 — Low — Licenses.** From package metadata [to confirm from each wheel's `METADATA` during the spike]: pydantic MIT, pydantic-core MIT, annotated-types MIT, typing-inspection MIT, typing-extensions PSF-2.0; Pyodide MPL-2.0 (redistributing unmodified files is allowed; keep its license notice and point to the source); CPython stdlib in `python_stdlib.zip` PSF-2.0. All are compatible with redistribution in a static site. Ship a `THIRD_PARTY_LICENSES` (or `pyodide/LICENSES.txt`) next to the copied runtime in the build, and add a license check to the vendoring script (reject a wheel whose `License`/`License-Expression` is not in an allow-list).

---

## Recommended order

1. B1 (verify isolation + timeout) before more lessons are contributed.
2. B4 and B2 (cheap, improve grading reliability).
3. A1 theory fix and the Security notes in specs 06/07 for modules 07, 11, 12, 13; add `12-tooling/09-supply-chain-adr` to the curriculum.
4. C1 vendoring script with hash verification as part of the module 13 spike.
5. B3, B5–B8 as hardening.

---

## Re-review after hardening

Date: 2026-11-04. Scope: the working-tree changes to `src/verify/graders.ts`, `src/engines/python/engine.ts`, `src/engines/python/python.worker.ts`, `src/engines/python/runtime/dojo_harness.py`, and the new `src/verify/pythonSandbox.ts`, `pythonSandbox.worker.ts`, `pythonSandbox.test.ts`. Every bypass below was reproduced with throwaway Vitest probes that drive `PythonSandbox` from the scratchpad, outside the repo (Node 26.10, `pyodide@314.0.7`). The repo suites pass: `pythonSandbox.test.ts`, `src/verify/python.test.ts`, `src/verify/ai-engineering.test.ts` and `src/engines/python` (4 files, 527 tests).

### Status of the original findings

| ID | Status | Notes |
| --- | --- | --- |
| B1 | **Partially fixed, still Critical** | Fixed: `js` is a filtered globals object, `process.env` is empty, `getBuiltinModule`/`binding`/`dlopen` are blocked, `import()` is blocked by `registerHooks`, and `fetch`/`WebSocket` are removed. Still open: the bypasses R1–R3 below give host file read/write and the full host environment |
| B2 | **Partially fixed** (Medium) | Bindings are restored. In-place mutation of stdlib objects still leaks (R5) |
| B3 | Fixed in verify, **open in the browser** | `python.worker.ts` does not lock anything down; `js.fetch`/`pyfetch` still work there [inferred, unchanged code] |
| B4 | **Fixed** | `python.worker.ts:28-43` wraps the handlers and posts `failed`, and `browserClient.ts` terminates the worker on `failed` |
| B5–B8, C1, C2 | Open | Not in scope of this change |
| A1 | Fixed | Theory section "Matching is not security" (NFKC, UTS #39, UTS #46) and challenge wording "case- and composition-insensitive" |

### New findings

**R1 — Critical — Host file system through NODEFS.** [verified] `lockDown()` (`pythonSandbox.worker.ts:28-40`) leaves Pyodide's own Node file-system bridge in place. From `tests.py` or lesson code:
- `pyodide_js.mountNodeFS("/host", "<any host dir>")` listed a host directory;
- `pyodide_js.FS.mount(pyodide_js.FS.filesystems.NODEFS, {root: "/etc"}, "/host2")` followed by `open("/host2/hostname").read()` returned the machine's hostname.

NODEFS can also write, so lesson code can overwrite `node_modules/.cache/dojo-python-sandbox/worker-*.mjs` (`pythonSandbox.ts:39,61`), shell rc files or repo files. That reaches code execution with full privileges on the next run. **Fix:** after `createPythonEngine`, delete `pyodide.mountNodeFS`, `pyodide.FS.filesystems.NODEFS` and `NODERAWFS` (they are the same objects as `pyodide._module.FS.filesystems`), then add a sandbox test that asserts both calls fail.

**R2 — Critical — Host environment and file write through `process.report`.** [verified] The worker's `env: {}` only empties the worker's copy of `process.env`.
- `js.Object.constructor("return process.report.getReport()")()` returned `environmentVariables` with 113 host variables (including `HOME`) plus the full command line. On CI that includes every secret in the job environment.
- `process.report.writeReport(path)` wrote a 38 kB file at an arbitrary host path.

**Fix:** add `report` and `loadEnvFile` to `PROCESS_CAPABILITIES`. A stronger alternative is to use an allow-list: replace `globalThis.process` with a minimal stub after Pyodide has loaded, if Pyodide does not need it at run time (to be verified).

**R3 — High — Host file read through `process.loadEnvFile`.** [verified] `process.loadEnvFile("<host path>")` parsed a host `.env` file, and its values became readable through `process.env`. Any `KEY=VALUE` file on the host can be read this way (`.env`, many credential files). **Fix:** add `loadEnvFile` to `PROCESS_CAPABILITIES`.

**Structural recommendation for R1–R3.** A deny-list on `process` and the Pyodide API will keep missing members. The durable fix is to run the grader in a **child process** (`child_process.fork`) with `env: {}` and `execArgv: ['--permission', '--allow-fs-read=<node_modules/pyodide>,<bundled worker file>']`. The Node permission model is process-wide, so it cannot be applied to a `worker_threads` Worker. It denies fs writes, child processes, workers, native addons and (Node 25+) network unless they are allowed. Keep the existing deny-list as a second layer.

**R4 — Info — Per-test kill and leaks: working.** [verified] A synchronous loop, an async busy loop, `time.sleep` and a JS `Atomics.wait` on a `SharedArrayBuffer` were each stopped within the 3 s limit. The next test ran in a fresh worker (`pythonSandbox.ts:264-270,137-142`).
- Five consecutive kills kept the process thread count flat (45 → 43).
- RSS rose from 268 MB to 384 MB and fell back to 294 MB after `stop()`, so no lasting leak.
- Each kill costs about 4.5 s, mostly Pyodide restart.
- Residual risk: no `resourceLimits` on the Worker. A memory bomb grows wasm memory inside the Vitest process. This is Low because wasm32 caps it at 4 GB per worker.

**R5 — Medium — State restore misses in-place mutation.** [verified] `InterpreterState.restore()` (`dojo_harness.py:189-266`) restores bindings (builtins, `sys.modules`, the top-level dicts of `RESTORED_NAMESPACES`, paths, hooks, loggers, env, cwd, `/tmp` and `~`). It does not restore objects mutated in place. A polluting test changed all of the following, and they stayed changed for the next test **and the next lesson** (a second `runTests` call):
- `json.JSONEncoder.default = …` made `json.dumps(object())` return `"patched"`. This would let a wrong starter pass `07-stdlib/02-json-and-serialization` ("unknown types raise `TypeError`").
- `copy._deepcopy_dispatch[list] = …` changed `copy.deepcopy([1])`, which affects `01-object-model/05-shallow-vs-deep-copy`.
- `collections.abc.Mapping.register(list)` made `isinstance([], Mapping)` true.
- `gc.disable()`, `js.dojoProbe = 42` (a property on the JS global), `logging.raiseExceptions` and `logging.Formatter.default_msec_format` all persisted. `logging` is not in `RESTORED_NAMESPACES`.
- Not reproduced, known Python behaviour: `sys.addaudithook` hooks can never be removed. `codecs.register`, `copyreg.pickle`, `warnings.filters` changed by a Run demo (outside `catch_warnings`), `asyncio` policy changes and `pyodide_js.setStdout` replacing output callbacks would also persist.

**Fix:** in the browser, start a fresh worker per lesson. Pyodide is served from the HTTP cache, at roughly 1–2 s. In verify, start a fresh sandbox per lesson (`defineChallengeSuite` level) and keep `InterpreterState` for test-to-test isolation within a lesson. Add `gc.enable()`, `logging` and `copy`/`copyreg` to the restore set. Treat full in-process isolation as out of reach (see the threat model).

**R6 — Medium (regression risk, module 13) — Native extensions are dropped from `sys.modules` after every test.** [inferred] `_restore_namespace(sys.modules, …)` deletes every module imported after the snapshot. With Pydantic loaded on demand, `pydantic_core._pydantic_core` (PyO3) would be re-imported on the next test. PyO3 refuses a second initialization in one interpreter ("PyO3 modules may only be initialised once per interpreter process"), so every test after the first would fail with `ImportError`. Pure-Python packages would also be re-imported on every test, which costs time. **Fix:** never remove extension modules (`isinstance(getattr(module, "__spec__", None) and module.__spec__.loader, importlib.machinery.ExtensionFileLoader)`), or take the snapshot after the lesson's packages have been loaded. Add a check for this to the module 13 spike in `08-module-13-and-capstone.md`.

**R7 — Low — Browser worker cost and behaviour.** [inferred, not run in a browser]
- `import dojo_harness` now preloads 25 stdlib modules and builds `InterpreterState` at startup (`dojo_harness.py:141-145,192-217`). That adds to the first-run time.
- Each test now runs `gc.collect()` and `restore()`, which scans `/tmp` and `~`.
- `engine.ts` always passes a JS `notify` callback, so the browser pays one JSON round trip per test event without using it. Passing `None` when `onEvent` is absent avoids that.
- The browser path still has no per-test kill, only the 45 s whole-suite terminate in `browserClient.ts`, so one hanging test still loses every other result in the UI.
- `PYTHONHASHSEED=0` (`engine.ts` `PYTHON_ENV`) makes set and dict-of-str iteration deterministic. This helps graders, but lessons must not present that order as guaranteed: `01-object-model/03-mutability-and-hashing` should keep saying that hashes are salted per process in real CPython (A2).

**R8 — Low — Grading can still be forged in verify.** [inferred] Lesson code can walk frames (`sys._getframe().f_back…f_locals["notify"]`) and emit fake `result` events, or patch `dojo_harness` in place. This only matters if a contributor wants a starter to "fail" or a solution to "pass" dishonestly, and review of `tests.py` covers that case. Accept.

### ai-engineering Python variants

There is no regression in verify: `src/verify/ai-engineering.test.ts` passes inside the new sandbox. `dojo_ai` and `dojo_ai.testing` are in `RESTORED_NAMESPACES`, `_dojo_ai_bridge.reset()` still runs around each test, and leftover asyncio tasks are cancelled (`dojo_harness.py:357-361`). The new never-awaited-coroutine check (`unawaited_coroutines`) can fail tests that passed before. It is a behaviour change, intended and covered by `pythonSandbox.test.ts:169-197`. The browser path was not exercised.

### Priority

1. R1 + R2 + R3 (Critical/High): remove NODEFS/`mountNodeFS`, `process.report` and `loadEnvFile` now, add sandbox tests for each, then move to a `fork` + `--permission` child process.
2. R6 before the module 13 spike.
3. R5: a fresh interpreter per lesson in verify and in the browser.
4. B3 in the browser worker, R7.

---

## Re-review 2

Date: 2026-11-04. Scope: `git diff HEAD -- src/verify/graders.ts src/engines/python/` plus `src/verify/pythonSandbox.ts`, `pythonSandbox.child.ts` and `pythonSandbox.test.ts`. The design is now:
- `child_process.fork` children (`pythonSandbox.ts:388-398`) with `env: {}` and `--permission`, with `--allow-fs-read` for `node_modules/pyodide/` and the bundled child script only;
- `lockDown()` (`pythonSandbox.child.ts:454-472`) removes NODEFS/NODERAWFS, `mountNodeFS`, the network globals and a list of `process` members;
- a fresh interpreter whenever the `tests` source changes (`pythonSandbox.ts:151-154`), booted from a Pyodide memory snapshot;
- extension modules kept in `sys.modules`.

All probes were re-run from the scratchpad against this version (Node 26.10), and the probe files were deleted afterwards. Repo suites pass: `pythonSandbox.test.ts`, `src/verify/python.test.ts`, `src/verify/ai-engineering.test.ts` and `src/engines/python` (4 files, 528 tests).

### Probe results

| Probe | Result | Status |
| --- | --- | --- |
| `pyodide_js.mountNodeFS`, `FS.filesystems.NODEFS`, `_module.NODEFS` | absent; only `MEMFS, IDBFS, WORKERFS, PROXYFS, NATIVEFS_ASYNC` remain | R1 **fixed** |
| `process.report`, `loadEnvFile`, `binding`, `_linkedBinding`, `getBuiltinModule`, `dlopen` (own and prototype) | `undefined` | R2, R3 **fixed** |
| `process.env` | empty | fixed |
| `process.permission.has(...)` for `fs.read` (generic and `src/content`), `fs.write`, `child`, `worker`, `net`, `inspector`, `addon`, `wasi` | all `false` | fixed: the permission model is active |
| `import("node:fs")` from `Function` | blocked by the `registerHooks` resolve hook | fixed |
| `require`, `globalThis.require`, `module` | `undefined` | fixed |
| `pyodide_js.loadPackage("/etc/hostname")` | rejected as an invalid package name | fixed |
| Python `socket.create_connection(("1.1.1.1", 80))` | `OSError: Host is unreachable` | fixed |
| `process._debugProcess(process.ppid)` | **works**: the parent Vitest process printed `Debugger listening on ws://127.0.0.1:9229/…` and `ss` showed `node-MainThread` listening on 9229 | **R9, open (High)** |
| `process._kill(process.ppid, 0)` | **works** (signal delivered) | **R10, open (High)** |
| `process.send`, `process.channel` | present (IPC to the parent) | R8, accepted (Low) |
| Reading `node_modules/pyodide` | allowed by the flag, but the child has no JS file API left (`fs`, `require`, `import()`, `getBuiltinModule`, NODEFS all gone). The directory holds only the Pyodide distribution; lesson sources are not on the allow-list (`has('fs.read', '<repo>/src/content')` is `false`) and reach the child only as in-memory `files` | Not exploitable |
| Memory snapshot | made once per host process by a child that runs no lesson code (`pythonSandbox.ts:318-332`), kept in parent memory, and sent to each child by IPC as a copy (`serialization: 'advanced'`). Children cannot write to disk, so the snapshot can be neither shared nor modified across lessons | Not exploitable |

### Open findings

**R9 — High — Lesson code can open the Node inspector in the unrestricted parent.** [verified] `process._debugProcess(pid)` sends `SIGUSR1` to any process of the same user, and the permission model does not gate it. Pointed at `process.ppid`, the Vitest process (no permission model) started its inspector on `127.0.0.1:9229`. The child cannot connect to it (network is denied), but any other local process can, without credentials, and run code in Vitest with full host access. On a shared runner or a developer machine, that is a boundary escape that needs only one cooperating local process. **Fix:** add `_debugProcess`, `_debugEnd`, `_kill`, `abort` and `reallyExit` to `PROCESS_CAPABILITIES` (`pythonSandbox.child.ts:415-418`). Better still, replace that list with an allow-list: keep only the `process` members Pyodide uses after boot (to be determined) and set every other own and prototype member to `undefined`. Add a test that asserts `typeof process._debugProcess === "undefined"`.

**R10 — High — Lesson code can signal any process of the user.** [verified with signal 0] `process.kill` is removed, but the underlying `process._kill(pid, signal)` is still available, and the permission model does not cover signals. `process._kill(-1, 9)` would kill every process of the CI or developer user, and `process._kill(process.ppid, 9)` kills the test runner. (Neither destructive variant was run.) **Fix:** the same change as R9.

**R5 — Medium → Low, partially fixed — In-place mutation leaks.** [verified]
- **Between lessons: fixed.** Each new `tests` source got a new pid, and every polluted value was clean.
- **Between tests of one lesson:** `json.JSONEncoder`, `gc`, `copy`/`copyreg` tables and `functools` attributes are now restored (`dojo_harness.py:32-37,166-168,219-220`). Still leaking: ABC registrations (`collections.abc.Mapping.register(list)` makes `isinstance([], Mapping)` true), properties written on the JS global (`js.dojoProbe`), and attributes set on classes outside `RESTORED_CLASSES` (`enum.Enum.dojo`).
- **Between solution and starter of one lesson:** `challengeSuite.ts:33,47,61` runs the solution tests, the solution demo and the starter tests with the same `tests` source, so they share one interpreter (same pid in the probe). A solution that registers an ABC or writes a JS global at import can make the starter's result wrong.

**Fix:** retire the interpreter per `runTests` call rather than per `tests` source, which costs about 0.1 s with the snapshot. That removes the solution→starter path. Test-to-test leakage within one run is then limited to the learner's own code, which is acceptable.

**R6 — fixed in code, untested with a real extension.** `_is_extension` keeps extension modules (`dojo_harness.py:127,155`). No Pyodide-native package is loaded yet, so the PyO3 re-initialization case stays a check for the module 13 spike.

**R11 — Low — Reliance on an experimental API.** `_makeSnapshot`/`_loadSnapshot`/`makeMemorySnapshot` (`pythonSandbox.child.ts:479-481,493`) are underscore-prefixed Pyodide internals and can change in any Pyodide release. `snapshot()` resolves `undefined` when snapshot creation fails, so boot falls back to a cold start, but a snapshot that is created and then rejected at load would fail every boot. **Fix:** on a `failed` boot that used a snapshot, retry without it once. Pin a test to the current Pyodide version so a bump that breaks snapshots is noticed.

**R8 — Low, accepted.** `process.send` lets lesson code forge `test-event`/`test-report` messages to the parent, or flood the IPC channel. Only lesson authors control that code, and `tests.py` review covers it.

### Browser path (unchanged since the last review)

- B4: fixed (`python.worker.ts` posts `failed` on error).
- B3: still **open, Medium**. The browser worker removes no network globals and has no CSP. Learner code there is the learner's own, which is why this stays Medium.
- R7: still open (Low). There is no per-test kill in the browser.
- The harness changes run in the browser too. They are exercised by `src/engines/python` and the verify suites, but not in a real browser.

### Summary of severities still open

- **High:** R9 (inspector on the parent through `process._debugProcess`), R10 (`process._kill` on any user process). Both are closed by extending `PROCESS_CAPABILITIES`, ideally as an allow-list.
- **Critical:** none open. R1–R3 are fixed and the permission model blocks fs, child processes, workers, network and addons.
- **Medium:** B3 (browser network), and C1 (Pydantic vendoring), which are outside this change. A1 (identifier normalization) is fixed in `02-collections/08-text-and-bytes`.
- **Low:** R5 (solution→starter sharing), R7, R8, R11, and the earlier B5–B8 and C2.

---

## Re-review 3

Date: 2026-11-04. Scope: the same files as Re-review 2. SRE changes since then:
- the child's `globalThis.process` is a frozen allow-list (`pythonSandbox.child.ts:31-41,72`);
- IPC uses a `send` captured before the swap (`:21-22`);
- children start with `--disable-sigusr1` (`pythonSandbox.ts:386`);
- every `runTests`/`runProgram` gets a fresh interpreter.

I re-ran every probe from the scratchpad, including a breadth-first crawl of about 32,000 objects reachable from `globalThis`, `pyodide_js`, `pyodide_js._module` and `pyodide_js._api`. All probe files were deleted. Repo suites pass: `pythonSandbox.test.ts`, `src/verify/python.test.ts`, `src/verify/ai-engineering.test.ts` and `src/engines/python` (4 files, 532 tests).

### Results

| Finding / probe | Result | Status |
| --- | --- | --- |
| R9 `_debugProcess` on the parent | No `_debugProcess` reachable (own, prototype, crawl). Port 9229 was not listening before or after the run | **Fixed** |
| R10 `_kill` / `kill` / signals | `process.kill`, `_kill`, `send` are `undefined` on the frozen object, and `Object.defineProperty(globalThis, "process", …)` throws `Cannot redefine property`. The crawl found `pyodide_js._module._kill` and `LDSO…exports.kill`, but these are Emscripten's emulated libc: `_module._kill(1, 0)` returned `-1` and touched no host process | **Fixed** |
| R5 starter inheriting solution mutations | A solution `main.py` that registered `list` as a `Mapping` and set `js.dojoProbe` reported `[True, 7]`. The next run with the same `tests` source reported `[False, None]` | **Fixed** |
| Original `process` via `global`, `globalThis.global`, `Function`, `pyodide.code.run_js`, `internalBinding`, `primordials` | `global === globalThis` and sees only the allow-list. `internalBinding` and `primordials` are `undefined`. `Error.prepareStackTrace` callsites expose only the Pyodide file path and wasm frames, with no Node-internal `this` or function | **Fixed** |
| Captured IPC reference | `send` lives in a module-scope closure of the ESM child. The crawl did not reach it, and the replaced `process` has no `send` or `channel` | **Fixed** (R8 forging via IPC no longer possible; frame-walking to the harness `notify` remains, Low, accepted) |
| NODEFS / `mountNodeFS` / `_module.NODEFS` | Still absent | Fixed |
| **R12** Node `fs` reachable through Pyodide internals | The crawl found the real Node `fs` module at `pyodide_js.FS.streams[0].devops.stream[Symbol(kFs)]` (the stdin stream's `ReadStream`). It is contained by `--permission`: `readFileSync('/etc/hostname')` and `readdirSync('<repo>/src/content/python')` were denied (`ERR_ACCESS_DENIED`). `writeFileSync` to the scratchpad and `appendFileSync` to the cached child script were denied, and `symlinkSync` was denied. Only `node_modules/pyodide/package.json` was readable, which is in scope | **Low, open (defence in depth)** |
| Network through Node handles | `console._stderr[kHandle]` exposes the libuv `Pipe` constructor; `new Pipe(0).connect(req, "/run/user/1000/bus")` returned `Access to this API has been restricted. Use --allow-net`. The `undici.globalDispatcher` symbols exist on `globalThis` but hold no dispatcher. Python sockets are unreachable | Fixed (permission model) |
| `WebAssembly` / `SharedArrayBuffer` / `Atomics` | Shared wasm memory can be created. The only effect is blocking the thread with `Atomics.wait`, which the per-test kill already covers (R4) | Info |
| Crashing the child | Invoking arbitrary getters during the crawl killed the child (`ERR_INVALID_THIS` on a `WritableStreamDefaultWriter` getter). The parent reported `Python exited unexpectedly` and the next run got a fresh interpreter | Info (availability only, contained) |
| `console._stderr.write` | Works; it writes to the child's stderr, which the parent keeps as a 2,000-character tail | Info |

**R12 fix (optional hardening):** after `lockDown`, replace `pyodide_js.FS.streams[0..2].devops` stream references, or set the `kFs` slot of those Node streams to `undefined`. Better still, configure Pyodide `stdin` with a callback so it never opens a Node `ReadStream`. The permission model remains the real boundary either way. Add a test asserting `fs.readFileSync("/etc/hostname")` is denied, so a future change to `--allow-fs-read` is caught.

### Still open outside the verify sandbox

- B3 (Medium): there are no network restrictions in the browser worker.
- C1 (Medium): Pydantic vendoring needs a hash-checked step.
- A1 (Medium): the identifier-normalization caveat in `08-text-and-bytes`.
- Lows: B5–B8, R7, R11, R12, C2.

**Open Critical/High: none.**

---

## Re-review 4 (browser worker)

Date: 2026-11-04. Scope: `git diff 1131632 c127118` (branch `sre/browser-hardening`). The commit adds `src/engines/python/lockdown.ts`, applied in `python.worker.ts` and in the verify child. It also gives every `gradePython`/`runPython` a fresh worker with a 6 s per-test kill, boots workers from a memory snapshot, and starts verify children with `--max-old-space-size=256 --wasm-max-mem-pages=16384`.

Method: a scratch worktree at `c127118` with a Vite dev server on port 5199, driven from Chromium (Playwright). I imported `/src/engines/python/browserClient.ts` in the page and graded probe `tests.py` files through `gradePython`, so every probe ran in the real browser worker after `lockDownPython`. All probe files were deleted afterwards.

Suites in the worktree: `pythonSandbox.test.ts`, `python.test.ts` and `ai-engineering.test.ts` ran twice, 632 tests each time. The first run had 1 failure: "stops a sync infinite loop…" took 9.3 s under parallel load. The second run passed all 632, and `pythonSandbox.test.ts` alone passed 52/52, so I treat it as a timing-sensitive test (R14 below).

### What holds in the browser worker

| Probe | Result |
| --- | --- |
| `import js` contents | Only the 30 allow-listed names (`Object` … `setTimeout`, `queueMicrotask`, `TextEncoder/Decoder`) |
| `js.Object.constructor(...)` and the prototype `constructor` of `js.Promise.resolve`, `js.setTimeout`, `pyodide_js.runPython` | `EvalError: Code generation is disabled in the Python sandbox.` |
| `js.setTimeout("…", 0)` | `TypeError: setTimeout only accepts a function` |
| `pyodide.http.pyfetch` | fails (`AbortController` and `fetch` missing) |
| `pyodide.http.open_url` (XHR) | `XMLHttpRequest is not defined` |
| `pyodide.code.run_js` | `cannot import name 'eval' from 'js'` |
| `pyodide_js.loadPackage("https://…")` | refused: "Installing packages is disabled" |
| Python `socket.create_connection` | `Host is unreachable` |
| Prototype of a `create_proxy` PyProxy, `.constructor(...)` | hangs inside the proxy; the 6 s per-test kill stops it and the next test runs (availability only) |
| ai-engineering Python variants in the browser | I graded the solutions of `06-memory/04-long-term-memory` (8/8), `01-models/08-models-adr` (6/6) and `06-memory/06-memory-poisoning-and-privacy` (7/7) through the `dojo_ai` bridge. Both `demo.py` runs exited with code 0 and the expected output. No regression |

### Findings

**R13 — High — Code generation and network re-opened through `pyodide_js._api.tests.Function`.** [verified in Chromium] Pyodide exposes `_api.tests = { convertCppException, Function }`, which is a reference to the realm's original `Function` constructor. `lockDownPython` (`lockdown.ts:75-78`) only overrides `.constructor` on the four function prototypes; the `Function` object itself still works. From a Python test:
- `pyodide_js._api.tests.Function("return globalThis")()` returned the real `WorkerGlobalScope`, with `postMessage` and `Blob` present (`fetch` was correctly gone).
- `Function("return import('https://esm.sh/…/canvas-confetti.mjs')")()` **loaded and executed a remote module** (`remote module loaded: create,default`). That is network egress plus remote code execution in the worker.
- `import(URL.createObjectURL(new Blob(["export default 42"])))` worked (`blob import 42`).
- With the real global, `postMessage` lets learner code forge `test-report` messages (B5).

I rate this High against the control the change claims, not against platform impact: the browser threat model is learner self-harm, there is no backend, and progress lives in `localStorage`, which a worker cannot reach. In the **verify child** the same `Function` is reachable, but it gains nothing: the frozen `process` allow-list (`typeof process.kill === "undefined"`), the `registerHooks` resolver (remote and `node:` imports are blocked: "Importing … is not allowed") and `--permission` all hold [verified].

**Fix:**
1. In `lockDownPython`, delete `pyodide._api.tests`. Better, also replace `globalThis.Function`, `eval` and the async and generator function constructors with throwing stand-ins, in addition to the prototypes.
2. The durable fix is a CSP on the **worker script response** (CSP3: a dedicated worker uses the policy delivered with its own script; the page `<meta>` does not apply): `Content-Security-Policy: default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'`. Without `'unsafe-eval'`, the engine itself refuses `Function`/`eval` whatever reference is held. `script-src 'self'` blocks `import()` of remote and `blob:` URLs, and `connect-src` blocks any other network API. Serve it from the dev middleware and the static host config, and check that Pyodide boots with only `'wasm-unsafe-eval'`. Add a browser probe for `_api.tests.Function` to the test plan.

**R12 (browser counterpart) — Low — Local storage reachable.** The crawl found `pyodide_js._module.IDBFS.indexedDB`, and `pyodide_js.FS.filesystems` still lists `IDBFS`, `NODEFS`, `NATIVEFS_ASYNC` and `mountNativeFS`. IndexedDB of the app origin is reachable (unused by the app; it allows only persistence by the learner's own code). NODEFS is inert in the browser. **Fix:** remove `IDBFS`, `NODEFS` and `NATIVEFS_ASYNC` from `FS.filesystems` and delete `mountNativeFS` in `lockDownPython`.

**B3 — Medium → partially fixed.** Direct network globals are gone. Indirect network is still possible through R13 until R13 is fixed.

**B5 — Low, open.** Forged `postMessage` results are possible through R13. `browserClient.ts` checks `id` (`attempt`), but ids are sequential.

**R14 — Low — Timing-sensitive test.** `pythonSandbox.test.ts` "stops a sync infinite loop" failed once (9,322 ms) when run together with `python.test.ts` and `ai-engineering.test.ts`. It passed on re-run and alone. Under parallel load, child startup plus the 6 s limit exceeds the asserted bound. **Fix:** raise `RESTART_ALLOWANCE_MS` or run the sandbox suite with `--no-file-parallelism` in CI.

**Verify limits.** Process isolation and the memory flags did not regress. I did not probe `--max-old-space-size=256` and `--wasm-max-mem-pages=16384` (1 GiB of wasm) beyond the suites passing.

**Open Critical/High: R13 (High) — `pyodide_js._api.tests.Function` restores code generation and remote `import()` in the browser worker. Fix before merging.**

---

## Re-review 5

Date: 2026-11-04. Scope: `git diff c127118 17c5b05` (branch `sre/browser-hardening`). The changes:
- `lockDownPython` (`src/engines/python/lockdown.ts:89-113`) deletes `_api.tests`, replaces `Function`/`eval` and the four function-prototype constructors with throwing stand-ins, and removes `indexedDB`, `IDBFS`, `NODEFS`, `NATIVEFS(_ASYNC)`, `mountNodeFS` and `mountNativeFS`;
- `src/verify/pythonEscapeScan.py` walks reachable objects looking for original code generators;
- `plugins/pythonWorkerCspPlugin.ts` sends `default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'` on the worker script in dev and preview.

Method: a scratch worktree at `17c5b05`. `npm run dev` (port 5201) and `vite build` + `vite preview` (port 5202) were driven from Chromium (Playwright). Python probes ran in the booted worker through `browserClient.gradePython` in dev. CSP probes ran in an un-booted worker (before the run-time stubs) through Playwright's worker handle, using code paths that CSP governs: string timers, `import()` and `fetch`, not the DevTools-evaluated code itself, which CDP exempts. The worktree, build output and servers were removed afterwards.

Suites in the worktree: `pythonSandbox.test.ts`, `python.test.ts` and `ai-engineering.test.ts` passed 633/633 in one run.

### Results

| Probe | Result | Status |
| --- | --- | --- |
| R13 chain `pyodide_js._api.tests.Function` | `_api.tests` absent (`AttributeError: tests`) | **R13 fixed** |
| `Function` via `js.Object.constructor`, `Function.prototype.constructor`, a bound constructor, the stand-in's own prototype chain | `EvalError: Code generation is disabled in the Python sandbox.` | fixed |
| AsyncFunction via instances (`pyodide_js.runPythonAsync`, `useNodeSockFS`, the only async/generator functions on the API) → `.constructor` | `EvalError` | fixed |
| `pythonEscapeScan.scan(max_nodes=15000)` in the browser worker (the 6 s per-test limit caps the budget) | `found=[]` | fixed (budget-limited; the full scan runs in verify) |
| CSP header, dev: `/src/engines/python/python.worker.ts?worker_file&type=module` | sent | fixed |
| CSP header, production build under `vite preview`: `/assets/python.worker-<hash>.js` | sent; the page itself has no CSP (the worker policy is enough) | fixed |
| CSP enforced in the worker, **dev**: string `setTimeout` | did not run; `securitypolicyviolation: script-src eval` | enforced |
| CSP enforced, **dev**: `import()` of `data:`, `blob:` and `https://esm.sh/…` URLs; `fetch("https://example.com")`; `WebSocket` | all blocked; `fetch('/pyodide/pyodide-lock.json')` from our origin still 200 | enforced |
| CSP enforced, **production preview**: string timer, `import("data:…")`, remote `fetch` | all blocked; violations `script-src`, `script-src-elem`, `connect-src` | enforced |
| Pyodide boots under the CSP (`'wasm-unsafe-eval'` only) | yes, in dev and in the production build | OK |
| `WebAssembly.compile` of bytes in the worker | allowed (that is what `'wasm-unsafe-eval'` grants). From Python, `_module.wasmTable`/`convertJsFunctionToWasm` and other wasm helpers are reachable, but `WebAssembly.Module`/`instantiate` was not found within the scan budget. Even with attacker bytes, wasm has no ambient I/O: it can only call imports the caller passes from the allow-listed `js` globals, and `connect-src 'self'` still bounds every network API | Not exploitable for network (Info) |
| `WorkerGlobalScope.prototype` restoration | The real global is no longer reachable from Python: `_api.tests` was its only path in Re-review 4, and the scan finds no generator. Even with the global, the network members were deleted from the prototype chain and redefined as non-configurable `undefined`, and CSP independently blocks `connect-src`/`script-src` | fixed |
| `indexedDB`, `IDBFS`, `NATIVEFS*`, `mountNativeFS` | removed (Re-review 4's browser R12) | fixed |
| ai-engineering Python variants, production build | `06-memory/04-long-term-memory` 8/8, `01-models/08-models-adr` 6/6 and `06-memory/06-memory-poisoning-and-privacy` 7/7, graded through the built worker and the `dojo_ai` bridge under the CSP | no regression |

### Remaining items

- **B5 — Low, accepted.** With the real global unreachable, forging `postMessage` results needs a new escape; frame-walking to the harness `notify` within Python remains (R8).
- **R15 — Low — the CSP depends on the production host.** The policy is only sent by Vite dev/preview. A static host that serves `assets/python.worker-*.js` without the header falls back to the run-time stubs alone, which are sound today but are a deny-list. Add a deployment check (for example a smoke test that fetches the worker asset and asserts the header), and keep the CONTENT_GUIDE.md note.
- **R14 — Low.** The timing-sensitive sandbox test did not fail in this run; keep the earlier recommendation.
- Still open from earlier reviews (outside this change): C1 (Pydantic vendoring, Medium), A1 (identifier normalization, Medium), B6–B8, R7, R11, C2 (Low).

**Open Critical/High: none.**

---

## Re-review 6

Date: 2026-11-04. Scope: `git diff 17c5b05 06c9ffc`. The commit makes two changes. First, `pythonSandbox.child.ts:82` runs `os.urandom(1)` before `lockDown`, so Emscripten's lazy `getentropy` loads `node:crypto` while imports are still allowed. Second, the child bundle is written to `python-sandbox-child-<sha256 prefix>.mjs`, and `--allow-fs-read` names that exact file (`pythonSandbox.ts:84,385-401`). I probed from a scratch worktree at `06c9ffc` and removed it afterwards. `pythonSandbox.test.ts` passed 54/54, including the new entropy test (`os.urandom`, `secrets`, `uuid4`, `tempfile.mkdtemp`, unseeded `random.Random`).

| Question | Finding | Status |
| --- | --- | --- |
| Does the preloaded `node:crypto` become reachable from Python? | No. Emscripten keeps it in a closure: `initRandomFill` does `var nodeCrypto = require("node:crypto"); return view => nodeCrypto.randomFillSync(view)`, and the internal `randomFill` used by `os.urandom` is a closure variable (`pyodide.asm.mjs`). The exported `Module.randomFill` and `Module.initRandomFill` are the lazy originals. Calling either from Python after lock-down re-runs `require("node:crypto")`, which the `registerHooks` resolver refuses (`Importing "node:crypto" is not allowed`). `Module.randomFill` has only `length`/`name`. No crypto module object (`createHash`, `KeyObject`, `setEngine`, `webcrypto`) is a property of anything reachable | No new capability |
| Even if `node:crypto` leaked | `createPrivateKey` and similar take key material, not paths. `setEngine` would need a library path, and `--permission` (no `addon`, read limited to `node_modules/pyodide/` and the child file) plus the absence of any fs write keep that closed | Info |
| Hashed child path in `--allow-fs-read` | Still exactly two read grants: `node_modules/pyodide/` (directory, unchanged since Re-review 2) and the one hashed child file. There is no directory-wide grant on `node_modules/.cache`, so a child cannot read other worktrees' bundles. The old `python-sandbox-child.mjs` stays in the cache, unread | No change to the boundary |
| Bundle integrity | Content-addressed name, written via temp file plus `rename`, rewritten when content differs. This removes the cross-worktree mix-up the SRE found. A hostile local process could still swap the file between check and fork, which is outside the threat model (same user) | Low, accepted |
| **R16 — Low — crawling `_module` kills the child.** | Walking `pyodide_js._module` from Python (descriptor values only) ended the child with exit code 1 when it reached the `_asciiTextDecoder` prototype region, while Emscripten printed its GL error source. The parent reports `Python exited unexpectedly`, and the next run gets a fresh interpreter. Availability only, contained; I did not chase the exact trigger | Low, open |

**Addendum, `abef8f8`.** I re-ran the same review for `git diff 17c5b05 abef8f8`. The extra commit only strengthens the entropy test: `os.urandom(16)` differs between calls, `secrets.token_hex(8)` has length 16, and `tempfile.mkdtemp()` lands under `/tmp/`. It also updates the spike doc table (`13-sre-pyodide-spike.md`). No runtime, lock-down or permission code changed after `06c9ffc`, so the findings above hold. `pythonSandbox.test.ts` at `abef8f8`: 54/54.

**Open Critical/High: none.**

---

## Content review: module 11

Date: 2026-11-04. Scope: `src/content/python/11-metaprogramming/` at commit `73c1e86` (branch `worktree-agent-af104219bf7f94b43`), read-only. The focus was lesson `07-import-system-internals`, with lessons 02–06 skimmed. I judged them as teaching content: does the lesson model an unsafe habit, and what must it say?

### 07-import-system-internals

What is already right:
- `find_spec` returns `None` for names it does not serve, and a quiz question covers why a raising finder breaks every import.
- `uninstall` removes the finder and only the modules whose `__spec__.loader` is that finder.
- Every test restores `sys.meta_path` and `sys.modules` in `finally`, and the demo wraps its use in `try/finally`.
- Test module names are namespaced (`dojo_virtual_`).
- `theory.md` already has one bullet: "Executing source is running code … Serve only trusted sources."

Required changes:

| # | Severity | File / section | Change |
| --- | --- | --- | --- |
| C11-1 | **Medium** | `theory.md`, new section `## Security note` before `## When to choose it`, replacing the "Executing source is running code" bullet | See the text below |
| C11-2 | **Medium** | `challenge.md` (`install`), `solution/main.py`, `tests.py` | **Refuse names that would shadow the standard library.** With the finder at position 0, a key such as `"secrets"` or even `"ssl.helpers"` (which makes `ssl` an implicit package) hijacks `import ssl` or `import secrets` for the whole process, if that module is not imported yet. Spec text for `install`: "raise `ValueError` naming the module when the top-level name of any key is in `sys.stdlib_module_names` or `sys.builtin_module_names`; nothing is installed in that case". Solution: in `install`, check `{name.partition(".")[0] for name in sources}` before `insert(0, …)`. New test: `@test("install refuses names that would shadow the standard library")`, which checks that `capture_error(lambda: mod.install({"secrets": "X = 1"}))` and `mod.install({"hmac.extra": ""})` both raise `ValueError` and that `sys.meta_path` is unchanged. The starter keeps no check, so it fails this test. |
| C11-3 | **Medium** | `challenge.md`, first paragraph ("A plugin host keeps plugin source code in a database") | Add: "Treat that database as part of your code base: anyone who can write a row can run code in every process that imports it. Real plugin systems ship plugins as packages (wheels discovered through entry points, installed from a pinned, hashed lockfile) instead of executing stored source." |
| C11-4 | Low | `quiz.json`, one new question | "Plugin sources come from a table that support staff can edit through an admin page. The finder runs them with `exec(code, module.__dict__)`. Which statement is true?" Correct: "Anyone who can edit the table runs arbitrary code with the application's privileges; an import hook is not a sandbox." Distractors: "`exec` in a fresh module namespace isolates the code"; "Removing `__builtins__` from the namespace makes it safe"; "It is safe as long as the finder is uninstalled after the import". Explanation: in-process Python has no sandbox. `__builtins__` can be recovered through object dunders (`().__class__.__base__.__subclasses__()`), and the module stays loaded after `uninstall`. |
| C11-5 | Low | `theory.md`, "When to choose it" | Add: "`importlib.resources.files(package)` to read data files shipped inside a package (data, never code to `exec`); `spec_from_file_location` only for paths your program controls, never for a path taken from user input." |
| C11-6 | Low (optional) | `solution/demo.py` / `approach.md` | Mention a context manager (`with installed(sources) as finder:`) as the production shape of `install`/`uninstall`, so a finder never outlives its use after an exception. |

**C11-1 text (Security note):**

> ## Security note
>
> An import hook decides what code runs when any part of the process writes `import x`. Three consequences:
>
> - **It executes with full privileges.** `exec_module` runs the source as ordinary Python: it can open files, read environment variables and open sockets. Removing `__builtins__` or passing a restricted globals dict is not a sandbox; there is no safe way to run untrusted Python in-process. Serve only source you would commit to your repository, never user input, request data or rows that others can edit.
> - **A finder at the front shadows everything.** At position 0 of `sys.meta_path` it answers before the standard library and installed packages, for every module not yet in `sys.modules`. A served name like `json` or `ssl`, or a dotted key that turns `ssl` into an implicit package, replaces the real module for the whole process. This is the same failure as dependency confusion (a public package that shadows an internal name) and as a stray `json.py` next to your script. Namespace your names, refuse standard library names, and append the finder when it only needs to be a fallback.
> - **Clean up.** Remove the finder and the modules it loaded when you are done (`uninstall`, or a context manager), so later imports in the same process are not answered by code that is no longer meant to run.

### Lessons 02–06 (skim)

| Lesson | Finding | Severity |
| --- | --- | --- |
| 02-init-subclass-registries | Import-time registration only; no `exec`/`eval`. The map already says to prefer decorators and `__init_subclass__` | None |
| 03-dynamic-classes | Builds classes with `type(name, bases, namespace)` and validates field names with `str.isidentifier()` and `keyword.iskeyword()` (`solution/main.py:10`); no templated `exec` (the planned A.2 point is covered). Optional: also reject names starting with `_`, so a field cannot collide with dunders such as `__class__` | Low (optional) |
| 04-attribute-hooks | `Proxy` forwards every name, including `_private` ones, and writes every assignment to the target. That is fine as an auditing wrapper, but `theory.md` line 60 lists "access control" as a use of `__getattribute__`. **Change** that bullet to "(tracing, auditing). Attribute hooks are never a security boundary: `object.__getattribute__`, `object.__setattr__` and `vars()` bypass them, which is also how `Frozen` can be unfrozen." | Low |
| 05-metaclasses, 06-inspect-and-signatures | No `exec`/`eval`; `public_api` skips names starting with `_` | None |

No Critical or High findings in module 11. C11-1 to C11-3 should land before the module is marked written.
