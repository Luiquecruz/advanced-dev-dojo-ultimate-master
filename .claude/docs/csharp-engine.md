# The C# engine

The `csharp` engine grades C# challenges in the browser: the .NET 10 WebAssembly runtime and Roslyn run in a Web Worker, with no server, no .NET SDK and no committed binary. This file holds the engine's status, how a lesson gets a C# challenge, the security model and what is still open. Code-level internals are in [ARCHITECTURE.md](ARCHITECTURE.md#the-c-engine), the lesson format in [CONTENT_GUIDE.md](CONTENT_GUIDE.md#c-engine-csharp), the supply-chain controls in [CI_SECURITY.md](CI_SECURITY.md).

## Status

- The engine, its vendored files, the worker CSP, the Node verification sandbox and the regression tests exist. `src/engines/csharp/fixtures/basic/` is the only challenge graded by it: the solution passes 4/4 and the starter fails 3/4, in Chromium and in Node.
- **No lesson has a C# challenge on this branch, and the C# track is challenge-less until the integration below.** The track's content (`src/content/csharp/`, theory and quizzes) lives on the content branch with `"engine": "typescript"`. `src/verify/csharp.test.ts` is already the merged suite: the content standards of that branch (skipped while no `csharp` track exists here), without its "no challenge" rule, plus `defineChallengeSuite('csharp', csharpGrader())`. CI runs it in the `structure` job until the track exists.

## Integrating the content branch

1. Merge the content branch; on the `src/verify/csharp.test.ts` conflict keep this branch's version (it carries the content branch's checks).
2. Set `"engine": "csharp"` in `src/content/csharp/track.json` (the suite checks it).
3. Add at least one real lesson challenge, so CI grades content and not only the fixture. A first one was written and verified against the content branch for `03-collections-linq/02-linq-fundamentals` (`OrderReport`: `Where`/`OrderByDescending`/`ThenBy`, `GroupBy` + `ToDictionary`, `CountBy`, `DefaultIfEmpty().Max()`; solution 6/6, starter fails 5/6): `challenge.md`, `starter.cs`, `solution.cs`, `tests.cs`, `hints.md`, `approach.md`, with `meta.json` unchanged.
4. Run `npx vitest run src/verify/csharp.test.ts src/verify/content.test.ts src/verify/curriculum.test.ts`, mark the challenge in CURRICULUM.md, and add `Verify csharp` to branch protection.
- Checked in Chromium only. Firefox and Safari are not checked yet; that check is required before a lesson ships.

## Giving a lesson a C# challenge

1. The track's `track.json` declares `"engine": "csharp"` (a single-language track). C# is not in `content/languages.ts`; it is added there only if a multi-language track offers C# variants.
2. The lesson ships `starter.cs`, `solution.cs` (renamed to `Program.cs`) or `starter/` + `solution/` with `entry`, plus `tests.cs`, `hints.md`, `approach.md` and `meta.json` (written last). Format in CONTENT_GUIDE.md "C# engine".
3. `src/verify/<track>.test.ts` grades the challenges with `defineChallengeSuite('<track>', csharpGrader())`. A track whose suite enforces theory and quizzes only (no challenge files) has to merge that standards check with the challenge suite, keeping the structure checks and dropping the "no challenge" rule.
4. Run `npx vitest run src/verify/<track>.test.ts`, then open the lesson in the browser: only a lesson with a C# challenge downloads the engine (`prepareEngine`; theory and quiz lessons start nothing, and leaving C# challenges terminates the warm runtime), the test list comes from `tests.cs` before the first run. Test names must be string literals (`[Test("…")]`, not `nameof`): the client lists them without compiling and refuses a report whose names differ.

## Pins and served files

| Artifact | Version | Source | Checked against |
| --- | --- | --- | --- |
| `Microsoft.NETCore.App.Runtime.Mono.browser-wasm` (runtime pack) | 10.0.14 | nuget.org | SHA-512 `packageHash` of its catalog entry, then the pin in `vendor/dotnet/manifest.json` |
| `Microsoft.NETCore.App.Ref` (reference pack) | 10.0.14 | nuget.org | same |
| `Microsoft.CodeAnalysis.Common`, `Microsoft.CodeAnalysis.CSharp` (Roslyn) | 5.9.0 | nuget.org | same |
| `Microsoft.Net.Compilers.Toolset` (`csc.dll`, install time only) | 5.9.0 | nuget.org | same |
| .NET runtime for the machine (install time only, never served) | 10.0.14 | builds.dotnet.microsoft.com | SHA-512 in `releases.json`, then the pin per RID |

`scripts/csharp-track/vendor-dotnet.mjs` (`npm run csharp:vendor`, run by `postinstall`) compiles the host (`src/engines/csharp/host/*.cs` into `Dojo.Testing.dll` and `DojoHost.dll`, deterministic) and writes 57 files to `vendor/dotnet/` (git-ignored except `manifest.json`), 54 of them booted. `plugins/dotnetPlugin.ts` serves them under `dotnet/<version>/`, where `<version>` is the manifest's hash of the served set, and serves every `.dll` gzip-compressed as `.dll.gz`: Netlify compresses `.js` and `.wasm` with Brotli but sends `application/octet-stream` uncompressed (22.5 MiB of `.dll` files would have gone out raw). The worker gunzips with `DecompressionStream` before the SHA-256 check.

| Group | Files | Raw | Transferred |
| --- | --- | --- | --- |
| runtime JS + wasm (Brotli by the host) | 4 | 3.23 MiB | 1.02 MiB |
| CoreLib (`.dll.gz`) | 1 | 4.65 MiB | 1.48 MiB |
| assemblies: BCL, Roslyn, host (`.dll.gz`) | 35 | 16.55 MiB | 6.02 MiB |
| reference assemblies (`.dll.gz`) | 14 | 1.31 MiB | 0.46 MiB |
| licenses (`licenses/`, served, not booted) | 3 | | |

Total 25.75 MiB raw, 8.98 MiB transferred against a 9.5 MiB transfer budget: the script fails above it. That is over the spike's 8 MiB target, which assumed Brotli for every file (7.45 MiB); getting there needs Brotli in the worker (no browser-wide `DecompressionStream('brotli')`, so a vendored decoder) or Webcil `.wasm` assemblies (an SDK step today). The assembly set is what one compile and run loaded when booted with the whole runtime pack (`System.Text.Json` also needs `System.IO.Pipelines` and the two `Reflection.Emit` assemblies). The first install downloads about 107 MB and keeps 182 MB in `vendor/dotnet/.cache/`. `/dotnet/*` is cached as `immutable` (netlify.toml), so each fresh worker per run reads the files from the HTTP cache.

In CI (`CI` or `NETLIFY` set) the script never rewrites the manifest: a manifest that no longer matches the script, the host sources or the curated set fails `npm ci`, and a rebuild of missing files must reproduce the committed manifest byte for byte (it does: the build is deterministic). `vite build` also fails, and `npm run dev` warns, when the host sources changed since `DojoHost.dll` was compiled. The `csc` step runs with invariant globalization (no libicu needed on the build image) and downloads are retried with backoff.

Bumping a version: change `DOTNET` or `ROSLYN` in the script (keep .NET on the 10.0 LTS line, support ends 2028-11-14; bump Roslyn and the runtime together), run `npm run csharp:vendor`, which takes the new pins from the catalog and `releases.json`, review the `manifest.json` diff, then rerun the C# sandbox tests and the browser check.

## Security model

Learner C# runs in a dedicated worker (a fresh one per grading run and per **Run**) and, in verification, in a Node child under the permission model. The controls, by finding of the engine spike:

| Finding | Control | Covered by |
| --- | --- | --- |
| C1: learner C# reads the worker's JavaScript globals through `JSHost.GlobalThis` by reflection, and (engine review) calls any function under `globalThis`, `INTERNAL` or a registered module with any arguments through `JSFunctionBinding.BindJSFunction`/`InvokeJS` from a `DynamicMethod` | **the boundary:** after the warm-up `lockdown.ts` makes `Function.prototype.bind` throw; the runtime binds every JavaScript import with `fn.bind(owner)` and calls `bind` nowhere else after boot, so no new binding can be made (`JSHost.GlobalThis`, `ImportAsync`, `BindJSFunction` of `globalThis.*`, `INTERNAL.*` or `dojo-host` all fail) while the host's own `emit`, bound during the warm-up, keeps working. Behind it: the network globals, `getDotnetRuntime`/`dotnetDebugger`/`dotnetSidecar`, the worker's `postMessage`, `close`, `onmessage`, `navigator` (storage and the origin private file system, locks, GPU, USB, HID, serial, permissions), the file system handles, `OffscreenCanvas` and `Notification` are removed; `Function`, `eval` and every function constructor throw; the worker CSP refuses string compilation; and the host refuses (DOJO001) string literals that name `System.Reflection.Emit` or `System.Runtime.InteropServices.JavaScript`, which a name built at run time gets past | `csharp.test.ts`, the `DynamicMethod` probe (`fixtures/probes/JsCall.cs`) in `csharpSandbox.test.ts`, browser check |
| C2: `HttpClient` uses `fetch` | `System.Net.Http` is not shipped (CS0234, no load by name), the network globals are gone, `connect-src 'self'` | same |
| C3: references kept inside the runtime's own JavaScript | `lockDownDotnetInternals` removes `INTERNAL.require`, `process`, `dynamic_import`, `loadLazyAssembly`, `loadSatelliteAssemblies` and every `http_wasm_*`/`ws_*` binding, which learner C# could call through `JSFunctionBinding.BindJSFunction`; in Node every import is refused and `process` is an allow-list | `csharpEscapeScan.ts` (38 findings before the fix, none after), Node only |
| C4: MEMFS shared between runs | a fresh worker per run; `/tmp` emptied and the working directory restored before each run | sandbox tests ("fresh state per run") |
| C5: static fields and `AppContext` data of the BCL persist in one worker | a fresh worker per run | same |
| C6: integrity of the served assemblies | the worker and the verify child check every file (size and SHA-256, after gunzip) against the pins **bundled into their script**, not the served `manifest.json`; the build fails on a missing or altered file; the deploy smoke compares every `dotnet/<version>/` file byte for byte and checks immutable caching and compression | `csharp.test.ts`, tampering tests in `csharpSandbox.test.ts`, `smoke:worker-csp` |
| Forged grades (engine review) | requests carry a `crypto.randomUUID()` id; the worker's `postMessage` and every new JavaScript binding are gone; the client accepts a report only when its results equal the result events it watched, in order, and name the tests listed from `tests.cs` | `csharp.test.ts` (`reportMismatch`), browser check: a lesson that tries to post 300 forged reports is graded normally |
| Resource use (engine review) | the console of a run stops after 1,000,000 characters (events of at most 8192, then one notice) and the client cuts a line at 10,000; a stack overflow or `Environment.Exit` reports "the program exited"; the next spare starts only after a run, and leaving C# challenges terminates it | sandbox tests, browser check |

Learner code also cannot use `unsafe`, and only the `[Test]` methods declared in `tests.cs` run. `///` comments compile (`DocumentationMode.None`), and a diagnostic without a source location is reported with an empty file name.

## Open items

- **Integrity: runtime scripts are imported by URL after the check.** `dotnet.js`, `dotnet.native.js` and `dotnet.runtime.js` are hash-checked when fetched and then imported from the same URL; the CSP forbids `blob:` imports of the checked bytes. The path is versioned and immutable, so the import is answered from the HTTP cache the checked fetch filled; what is left is a cache eviction between the two requests or a same-origin attacker, who could replace the worker script itself.
- **The escape scan runs in Node only.** In the browser no binding can be made after the lock-down, so there is no reach from C# to scan; the browser check runs the `DynamicMethod` probe instead.
- **Grades can still be faked from inside the runtime** by reflecting into the host's cached `emit` binding and calling it with a `DynamicMethod`. It only cheats that learner's own progress, which is local (Python accepts the same, R8).
- **Browser memory is not capped:** the runtime's maximum memory is set when `dotnet.native.wasm` is linked; a probe reached 1920 MiB before `OutOfMemoryException`. Node verification caps it with `--wasm-max-mem-pages`.
- **Not measured yet:** Firefox and Safari, real download times, and the compression and caching headers on a Netlify deploy (the smoke test checks them on the next deploy).
- **Netlify build cost:** Netlify keeps no `vendor/dotnet`, so every deploy downloads about 107 MB and compiles the host. A Netlify build-cache plugin was not added: it runs after the dependency install, so it would need the install moved into the build command, which cannot be checked without a Deploy Preview.
- **Assembly contexts** of earlier runs are unloaded only at garbage collection; with a fresh worker per run this costs memory only inside one run.
- **Runtime migration:** WebAssembly .NET stays on Mono through .NET 11; the move to CoreCLR is planned for .NET 12, so the boot code (hand-written `withConfig`, `dotnetSidecar`) has to be checked again on that bump.
