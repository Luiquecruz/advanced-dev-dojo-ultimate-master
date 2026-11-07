# 04 — Engine spike: grading C# in the browser

**Research date: 2026-11-05.** Feasibility spike for a `csharp` engine that compiles and grades learner C# inside a Web Worker, the way the Python engine runs Pyodide (ARCHITECTURE.md "The Python engine"). Format mirrors [python-track/13-sre-pyodide-spike.md](../python-track/13-sre-pyodide-spike.md).

**Artifacts used (all public, pinned, downloaded into the session scratchpad, never into the repo):**

| Artifact | Version | Source | Integrity check done |
| --- | --- | --- | --- |
| `Microsoft.NETCore.App.Runtime.Mono.browser-wasm` (runtime pack: `dotnet.js`, `dotnet.runtime.js`, `dotnet.native.js`, `dotnet.native.wasm`, `System.Private.CoreLib.dll`, 171 BCL `.dll`, ICU) | 10.0.14 (published 2026-10-25) | `https://api.nuget.org/v3-flatcontainer/microsoft.netcore.app.runtime.mono.browser-wasm/10.0.14/…nupkg` | SHA-512 of the `.nupkg` equals `packageHash` of its NuGet catalog entry (`https://api.nuget.org/v3/catalog0/data/2026.10.25.18.18.28/microsoft.netcore.app.runtime.mono.browser-wasm.10.0.14.json`) |
| `Microsoft.CodeAnalysis.CSharp` + `Microsoft.CodeAnalysis.Common` (Roslyn, `lib/net10.0`) | 5.9.0 | nuget.org flat container | downloaded; hash check not repeated per package (same mechanism) |
| `Microsoft.NETCore.App.Ref` (167 reference assemblies + `analyzers/dotnet/cs/Microsoft.Interop.JavaScript.JSImportGenerator.dll`) | 10.0.14 | nuget.org | same |
| `Microsoft.Net.Compilers.Toolset` (`tasks/netcore/bincore/csc.dll`) | 5.9.0 | nuget.org | same |
| .NET **runtime** (not SDK) `dotnet-runtime-10.0.14-linux-x64.tar.gz`, 36.7 MB | 10.0.14 | `https://builds.dotnet.microsoft.com/dotnet/Runtime/10.0.14/…` | SHA-512 equals the `hash` in `https://builds.dotnet.microsoft.com/dotnet/release-metadata/10.0/releases.json` |

No .NET SDK was installed. Machine: 16 threads, Intel i7-12650H, load average ≈ 1, Node v26.10.0, Chromium 156 (Playwright MCP). Every number below says how it was obtained; "cited" numbers link their source.

Re-run this spike when the runtime pack or Roslyn version changes, and before .NET 12 (see §9, runtime migration).

## 1. Verdict

**GO-WITH-CONDITIONS.** A prototype built only from NuGet packages and the .NET runtime tarball (no SDK) booted the .NET WebAssembly runtime in a module Web Worker under this project's exact worker CSP, compiled learner C# with Roslyn, ran a minimal `[Test]`/`Assert` harness, graded solution 3/3 and starter 1/3, reported compile errors with positions, and an infinite loop was stopped by `worker.terminate()`. Conditions are in §10.

## 2. Feature results

PASS = verified in this spike. LIMITED = works with a caveat. FAIL = does not work. NOT TESTED = no evidence gathered.

| Capability | Result | Evidence (how) |
| --- | --- | --- |
| Boot runtime pack without SDK-generated boot config | PASS | `dotnet.withConfig({ resources: { jsModuleNative, jsModuleRuntime, wasmNative, coreAssembly, assembly, vfs } }).create()` (API from `dotnet.d.ts` in the runtime pack). Plain PE `.dll` files load (no Webcil conversion needed). Node and Chromium. |
| Load assemblies by URL from the default loader in a browser worker | FAIL (in this setup) | Assets passed by `name` only: `Can't find bindings module assembly: System.Runtime.InteropServices.JavaScript`. Fix used: the worker `fetch`es every file and passes `buffer` (also the natural place for a hash check). Cause not investigated. |
| Roslyn `CSharpCompilation.Emit` in wasm | PASS | Host `DojoHost.dll` with a `[JSExport] CompileAndTest(learner, tests)`; `LanguageVersion.Latest`; exercised records, a primary constructor (harness attribute), expression-bodied members, LINQ, collection initializers, string interpolation, nullable annotations. |
| Run emitted assembly | PASS | `AssemblyLoadContext(isCollectible: true).LoadFromStream` + reflection, unloaded after each run. |
| Compile diagnostics | PASS | `Learner.cs(1,71): error CS1525: Invalid expression term ';'` returned as data. |
| `Console.WriteLine` from learner code | PASS | printed to stdout in Node (capture into the report not built). |
| Running `csc.dll` itself on browser-wasm | FAIL | `System.Diagnostics.Process is not supported on this platform` from `Process.GetCurrentProcess()` in `Microsoft.CodeAnalysis.CSharp.CommandLine.Program.MainCore`. A host using the Roslyn API is required. |
| Worker CSP `default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'` | PASS | Header sent only on the worker script by a local static server; boot, compile and run succeeded; `new Function` and indirect `eval` probes inside the worker threw `EvalError`; the only `securitypolicyviolation` events were those two probes (2 per boot). |
| Stop a runaway loop | PASS | `while (true) { }` in learner code: host-side timer `worker.terminate()` at 3000 ms (Node: terminate took 9 ms); a fresh worker booted and graded the next run correctly. |
| Network from learner C# | LIMITED | Without lock-down, learner code read `JSHost.GlobalThis` (`location.href`, `typeof fetch == "function"`) and `HttpClient.GetStringAsync` started a request. After deleting `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `importScripts`, `Worker`, `indexedDB`, `caches`, `BroadcastChannel` from the worker scope and its prototype chain (after boot), Roslyn still compiled and `HttpClient` failed with `JSException: This browser doesn't support fetch API`. No escape scan was done (§7). |
| Virtual file system | LIMITED | Learner code can list `/ref` (167 files) and write/read `/tmp`; it is Emscripten MEMFS inside the worker. A fresh worker per run removes leaks. |
| Firefox, Safari, mobile | NOT TESTED | Only Chromium available. |
| Threads, `Task.Run` concurrency, `Thread.Sleep`, async tests | NOT TESTED | The runtime pack is the single-threaded build (no `jsModuleWorker` asset used). |
| AOT / faster execution | NOT AVAILABLE without SDK | AOT and relinking need the SDK `wasm-tools` workload; the no-SDK path runs IL on the Mono interpreter (`debugLevel: 0` enables interpreter optimizations per `dotnet.d.ts`). |
| IL trimming | NOT TESTED | `Microsoft.NET.ILLink.Tasks` 10.0.14 exists on NuGet; running it with the runtime tarball was not tried. |

## 3. Download size

Measured with Node `zlib` on the extracted files (gzip level 9, Brotli quality 11), i.e. what a host serving pre-compressed files would send. **Units in this table are binary MiB (2^20 bytes)**, Pyodide row included, so the comparison is like for like; in decimal MB every figure is ≈ 4.9% higher (runtime core Brotli 2.29 MB, minimal engine ≈ 7.3 MB, Pyodide 5.44 MB). The tarball (36.7 MB) and `.nupkg` (≈ 70.4 MB) sizes elsewhere in this document are decimal MB.

| Set | Files | Raw | gzip-9 | Brotli-11 |
| --- | --- | --- | --- | --- |
| Runtime core: `dotnet.js`, `dotnet.runtime.js`, `dotnet.native.js`, `dotnet.native.wasm`, `System.Private.CoreLib.dll` | 5 | 7.88 MiB | 2.71 MiB | **2.19 MiB** |
| Roslyn: `Microsoft.CodeAnalysis.CSharp.dll` + `Microsoft.CodeAnalysis.dll` | 2 | 9.71 MiB | 3.40 MiB | 2.71 MiB |
| Assemblies actually loaded after one compile + run (`AppDomain.GetAssemblies()`, default context, excl. CoreLib and host): Roslyn, `System.Private.Xml` (0.82 MiB br), `System.Reflection.Metadata`, `System.Collections.Immutable`, `System.Linq`, `System.Text.RegularExpressions`, `System.Security.Cryptography`, … | 24 | 15.43 MiB | 5.56 MiB | **4.50 MiB** |
| Reference assemblies, full `Microsoft.NETCore.App.Ref` | 167 | 5.77 MiB | 2.60 MiB | 2.27 MiB |
| Reference assemblies, 10-file subset (`System.Runtime`, `System.Console`, `System.Collections`, `System.Linq`, `System.Runtime.Extensions`, `System.Threading.Tasks`, `System.Text.RegularExpressions`, `System.Memory`, `System.Collections.Immutable`, `netstandard`) | 10 | 1.22 MiB | 0.41 MiB | 0.33 MiB |
| Host `DojoHost.dll` | 1 | 16 KiB (16,384 B) | — | ≈ 5 KiB (5,325 B) |
| ICU `icudt.dat` (only if not invariant globalization) | 1 | 1.46 MiB | 0.44 MiB | 0.31 MiB |
| **Minimal engine** (core + 24 loaded + host + 10 refs, invariant globalization) | 40 | ≈ 24.5 MiB | ≈ 8.7 MiB | **≈ 7.0 MiB** |
| Everything shipped in the prototype (all 171 BCL + Roslyn + host + 167 refs) | 346 | 39.72 MiB | 15.64 MiB | 12.82 MiB |
| Comparison: Pyodide 314.0.7 in this repo (`pyodide.asm.wasm`, `pyodide.asm.mjs`, `python_stdlib.zip`, `pyodide.mjs`), same method | 4 | 12.79 MiB | 6.01 MiB | 5.19 MiB |

The "minimal" set is enough for the sample lessons only. A lesson using `System.Text.Json`, `System.Linq.Expressions` and so on needs those assemblies too; the list must come from the curriculum (or lazy loading, NOT TESTED).

Public demo, measured: <https://microsoftlearning.github.io/c-sharp-minor/> (Blazor WebAssembly, Roslyn 4.14, untrimmed) — Resource Timing in Chromium after load: 208 requests, **15.27 MB transferred** (GitHub Pages served gzip), 41.6 MB decoded; largest: `Microsoft.CodeAnalysis.CSharp` 2.34 MB, `Basic.Reference.Assemblies.Net90` 2.09 MB, `System.Private.CoreLib` 1.51 MB, `dotnet.native.wasm` 1.19 MB, `System.Private.Xml` 1.06 MB (gzip transfer). Its README states trimming is disabled on purpose ([repo](https://github.com/MicrosoftLearning/c-sharp-minor)).

<https://lab.razor.fyi/> (.NET Lab) page-level Resource Timing showed 250 requests / 5.07 MB transferred, but its compiler runs in a worker and it is a PWA, so worker and cached downloads are not in that number: **not a usable figure**.

## 4. Timing

| Measurement | Node 26 worker_thread (buffers from disk) | Chromium 156 module Worker (localhost, uncompressed, `cache-control: no-store`) |
| --- | --- | --- |
| Boot to ready (`create()` + `getAssemblyExports`) | 124 ms / 104 ms (two boots) | 247 ms / 204 ms (includes fetching 346 files from localhost) |
| First compile + run (cold Roslyn on interpreter) | 1619 ms; 1747 ms after a reboot; 1521 ms (third run) | 1587 ms; 1223 ms after reboot; 1433–2387 ms in probe runs |
| Warm compile + run (same worker) | 111 / 90 / 91 / 100 ms; broken code 79 ms | 110 / 87 / 88 ms |
| Kill of `while (true) {}` | 3000 ms timer, terminate 9 ms | 3000 ms timer |
| Memory | process RSS 313 MB after 8 runs + reboot | not measured |

Timed with `performance.now()` around each call (host Stopwatch for compile). Timings on a real network add the download of ≈ 7–13 MiB Brotli (§3). Published Microsoft figures for Roslyn-in-wasm compile time: **not available** (none found). Public demo, measured from Chromium via Playwright (click Run → output text present): c-sharp-minor first run 1193 ms, then 244 ms; second round 937 / 146 ms.

Consequence: a fresh worker per run (Python §8 model) costs ≈ 0.2 s boot **plus ≈ 1.2–2.4 s cold Roslyn per run** (lowest 1223 ms, highest 2387 ms across the measurements above; most runs 1.4–1.75 s). Keep one warm worker, terminate it only on a timeout or crash, and pre-warm it with a throwaway compile when a C# challenge opens. Whether a memory snapshot (as Pyodide's) can skip the Roslyn warm-up: NOT AVAILABLE in the runtime pack API (`dotnet.d.ts` lists `interpreterPgo` only; not tested).

## 5. CSP

- Microsoft's guidance for client-side Blazor (ASP.NET Core 8.0–12.0 monikers) is `script-src 'self' 'wasm-unsafe-eval'`; `'unsafe-eval'` is only listed for 7.0 and older ([learn.microsoft.com CSP article](https://learn.microsoft.com/en-us/aspnet/core/blazor/security/content-security-policy?view=aspnetcore-10.0)).
- Static scan of the 10.0.14 runtime pack: `dotnet.runtime.js` contains one `new Function("proxy", …)`, inside the debugger's `callFunctionOn` path; no `eval(` in the three JS files; WebAssembly is compiled with `WebAssembly.instantiate`/`instantiateStreaming`/`compile` (covered by `'wasm-unsafe-eval'`).
- Measured: boot and grading under the exact worker policy of this project produced no violation besides the deliberate probes (§2). Unlike Pyodide (13-sre-pyodide-spike §8 noted EM_ASM `eval` concerns before §9 proved otherwise), nothing in the boot needs string evaluation.
- The policy must be sent with the C# worker script, exactly like `assets/python.worker-*.js` (a host header, `plugins/pythonWorkerCspPlugin.ts`, `npm run smoke:worker-csp`).

## 6. Runaway code and isolation model

- The Mono interpreter has no host-driven interrupt in the public API (`dotnet.d.ts`), and the runtime is single-threaded, so a C# busy loop blocks the worker; **only `worker.terminate()` stops it** (verified). Same model as Python: per-test start/result events from the worker, a per-test timer on the host, terminate, fail that test, resume in a fresh worker (Python §5/§8). With the boot and cold-Roslyn cost of §4, a restart costs up to ≈ 2.6 s (0.25 s boot + 2.4 s worst cold compile) plus the timeout; typical ≈ 1.6–2.0 s.
- Alternative not tested: compile tests and solution once, then run each test in its own worker from the emitted bytes (skips recompiling, still pays Roslyn load only if the runner worker does not reference Roslyn).
- Verify (Node): the same host and worker code ran under `worker_threads` (verified); a permission-model child process like `src/verify/pythonSandbox.ts` was NOT TESTED.

## 7. Security findings (to hand to the security review)

| # | Finding | Status |
| --- | --- | --- |
| C1 | Learner code reaches the worker's JavaScript globals through `System.Runtime.InteropServices.JavaScript.JSHost.GlobalThis` (read properties, typeof) even without the JSImport generator | verified; JS-side lock-down after boot removed `fetch` (verified). Hypothesis, not tested: removing the reference assembly from the learner compilation alone may not be enough, because reflection could name the type at run time; keep the JS-side lock-down regardless. |
| C2 | `HttpClient` uses the browser `fetch` | verified; blocked by lock-down + `connect-src 'self'` |
| C3 | No escape scan was done for captured references to `fetch`/`Function` inside `dotnet.runtime.js` closures (the Python track needed `pythonEscapeScan.py` to find `_api.tests.Function`) | open; CSP blocks string code generation regardless |
| C4 | MEMFS is shared by all runs of one worker (`/tmp` writes persist) | verified; fresh worker per lesson, or wipe `/tmp` |
| C5 | Static AppContext/static fields of BCL types persist across runs in one worker; only the learner assembly is in a collectible context | inferred from design, not tested |
| C6 | Integrity of served assemblies: the worker fetches every file itself (§2), so it can check SHA-256 against a manifest before `create()` | design, not implemented |

## 8. Test harness

Verified minimal design (≈ 30 lines of C#, compiled together with the learner file and `tests.cs` as a third syntax tree):

- `[Test("name")]` attribute, `Assert.Equal<T>`/`Assert.True`, `Harness.RunAll()` finds static methods with the attribute by reflection, runs each, catches `TargetInvocationException` and reports `PASS`/`FAIL name: message`.
- Learner and tests share one compilation, so a compile error in the starter fails the whole run with diagnostics (expected for a starter that must "fail at least one test"; starters must compile).
- To build: per-test events for the kill protocol, `Console` capture (`Console.SetOut`), structured JSON report, expected/actual formatting, test names read statically for the list shown before the first run (like `testNames.ts`), optional async tests (`Task`-returning) — NOT TESTED on the single-threaded runtime.
- Alternative not evaluated: xUnit/NUnit in wasm (heavier, threads, runners that use `Process`).

## 9. Getting the artifacts without the SDK

| Path | Needs at build time | Verified | Notes |
| --- | --- | --- | --- |
| **A. NuGet + runtime tarball in `postinstall`** (mirror of `scripts/python-track/vendor-packages.mjs`) | download 5 `.nupkg` (≈ 70.4 MB) + `dotnet-runtime` linux-x64 (36.7 MB), check SHA-512 against NuGet catalog `packageHash` and `releases.json`, unzip, then compile the ≈ 4 KB host with `dotnet csc.dll` using the ref pack and the `JSImportGenerator` analyzer | yes, end to end: `csc` on the runtime compiled `DojoHost.dll` in 1.19 s | no SDK, no MSBuild, no workload. Netlify builds the site itself and its image lists no .NET ([Netlify docs](https://docs.netlify.com/build/configure-builds/available-software-at-build-time/), Ubuntu 24.04), so the tarball download must run in Netlify's `postinstall` too (linux-x64 only; macOS/Windows contributors need their own RID or a prebuilt host, see C). |
| B. .NET SDK in CI (`actions/setup-dotnet`, pinned SHA) and in Netlify (install script) | SDK ≈ hundreds of MB per build; `dotnet publish` of a `browser-wasm` project gives trimming, Webcil and Brotli | not tried | Easiest build, worst fit: Netlify needs a custom install step; adds a second toolchain to the threat model (CI_SECURITY.md "Dependencies"). |
| C. Commit or vendor the compiled host `DojoHost.dll` | nothing | — | Binary in git; CI must rebuild and compare (reproducible builds of `csc` output not tested). Fallback only. |
| D. Run `csc.dll` itself on browser-wasm to build the host in Node | nothing native | **FAIL** (`Process.GetCurrentProcess`) | — |

Trimming (ILLink) and Webcil are SDK steps; path A ships untrimmed PE `.dll` files, which is why §3 lists 7 MiB (curated) to 13 MiB (all) Brotli. Pre-compressing `.br` files and serving them with the right `Content-Encoding` on Netlify, or decoding Brotli in the worker as Microsoft documents for hosts without content negotiation ([Blazor host and deploy](https://learn.microsoft.com/en-us/aspnet/core/blazor/host-and-deploy/webassembly/?view=aspnetcore-10.0)), is NOT TESTED on Netlify.

## 10. Conditions for GO

1. Path A in a `postinstall` script with SHA-512 pins in a manifest and a `--check` mode, same rules as the Pyodide wheels (CI_SECURITY.md "Dependencies"); the host compiled from source in the repo, never committed as a binary.
2. Worker CSP header on the C# worker in Vite dev/preview and on the host, covered by the deploy smoke check.
3. JS lock-down after boot (C1–C2) plus an escape scan equivalent to `pythonEscapeScan.py` (C3) before any lesson ships.
4. Per-test kill protocol and one warm worker; budget up to ≈ 2.6 s for a restart after a kill (worst measured case, §4, §6).
5. A curated assembly and reference set per curriculum, with a size budget (target ≤ 8 MiB Brotli, measured in a real deploy) and a lazy download only when a C# challenge opens (`prepareEngine`).
6. A Firefox and Safari check before release (NOT TESTED here).
7. Pin to an LTS line: .NET 10 is LTS, support ends 2028-11-14; .NET 11 is STS and at 11.0.0-rc.3 on 2026-10-25 ([releases-index.json](https://builds.dotnet.microsoft.com/dotnet/release-metadata/releases-index.json)).

## 11. Work items for the engine (per ARCHITECTURE.md "Adding a language")

| Step | Files |
| --- | --- |
| Engine | `src/engines/csharp/` new: `engine.ts` (grade/run API shared by browser and verify), `csharp.worker.ts` (boot via `withConfig`, fetch + hash check, lock-down), `browserClient.ts` (queue, per-test timer, terminate/restart, warm worker), `lockdown.ts`, `protocol.ts`, `testNames.ts` (`[Test("…")]` names), `host/DojoHost.cs` + `host/Harness.cs` (compiled by the vendor script) |
| Vendor + serving | `scripts/csharp-track/vendor-dotnet.mjs` (path A, `--check`), `package.json` (`postinstall` chain, `csharp:vendor`), `plugins/dotnetPlugin.ts` (serve/emit `dotnet/` like `pyodidePlugin.ts`), worker CSP plugin extended to the C# worker (`plugins/pythonWorkerCspPlugin.ts` or a shared one), `netlify.toml` header for `assets/csharp.worker-*`, `scripts/python-track/check-worker-csp.mjs` extended (or a shared smoke) |
| Registration | `src/content/types.ts` (`EngineId` += `'csharp'`), `src/content/loader.ts` (`DEFAULT_ENTRY.csharp = { cs: 'Program.cs' }` or similar), `src/content/languages.ts` (only if C# becomes a language of a multi-language track), `features/lesson/runner.ts` (`testNamesFor`, `gradeChallenge`, `runProgram`, `prepareEngine`, `canRunProgram`), `features/lesson/monacoSetup.ts` (`.cs` → `csharp`; Monaco's bundled C# highlighting not checked in this repo), `src/verify/content.test.ts` engine list |
| Verification | `src/verify/graders.ts` (`csharpGrader()`), `src/verify/csharpSandbox.ts` (Node worker or permission-model child, per-test kill), `src/verify/csharp.test.ts` (`defineChallengeSuite`), regression tests like `pythonSandbox.test.ts` (loop kill, lock-down probes, integrity failure) |
| Docs | ARCHITECTURE.md (engine section), CONTENT_GUIDE.md (C# engine, test format, host requirements), CI_SECURITY.md (new downloads), CONTRIBUTING.md (commands), CURRICULUM.md |

## 12. Existing in-browser C# compilers

| Project | How | Status | Source |
| --- | --- | --- | --- |
| C# minor (Microsoft Learning) | Blazor WebAssembly (.NET 9), Roslyn 4.14, `Basic.Reference.Assemblies.Net90`, trimming disabled, no external services; MIT; README says nothing about infinite loops | live, measured §3/§4 | [github.com/MicrosoftLearning/c-sharp-minor](https://github.com/MicrosoftLearning/c-sharp-minor) |
| .NET Lab (Razor Lab, jjonescz) | Blazor WebAssembly; compiler work in a Web Worker; loads a user-chosen Roslyn/Razor version at runtime; MIT | live; sizes not measurable from the page (§3) | [github.com/jjonescz/DotNetLab](https://github.com/jjonescz/DotNetLab) |
| Try .NET (dotnet/try) | — | retired 2025-12-31; repository archived | [dotnet/try#1285](https://github.com/dotnet/try/issues/1285) |
| Strathweb C# REPL in Blazor (2019) | Blazor 3.0.0-preview5; the article states the Roslyn scripting APIs "do not work on top of Mono WASM" (implicit references rely on `Assembly.Location`), so it uses `CSharpCompilation.CreateScriptCompilation`, emits to a `MemoryStream`, loads with `Assembly.Load` and fetches metadata references over HTTP | historical only (article read 2026-11-05) | <https://strathweb.com/2019/06/building-a-c-interactive-shell-in-a-browser-with-blazor-webassembly-and-roslyn/> |
| Moka.Blazor.Repl | NuGet Razor Class Library: Roslyn compilation, Monaco editor, NuGet package support, live preview of Blazor components; targets .NET 9 and .NET 10; MIT | 1.3.6 on nuget.org (package page read 2026-11-05); not run | <https://www.nuget.org/packages/Moka.Blazor.Repl> |

`Basic.Reference.Assemblies.Net100` exists on NuGet (1.8.14, checked via the flat container index) as an alternative to shipping the ref pack files; not evaluated.

## 13. Licensing

| Artifact | License (from the `.nuspec` in the package) |
| --- | --- |
| Runtime pack, ref pack | MIT (`<license type="expression">MIT</license>`), repo `github.com/dotnet/dotnet`; `THIRD-PARTY-NOTICES.TXT` (1418 lines: Mono, zlib-ng, Unicode data, ICU, …) must be shipped alongside, as `licenses/` is for Pyodide |
| Roslyn (`Microsoft.CodeAnalysis.*`, `Microsoft.Net.Compilers.Toolset`) | MIT, repo `github.com/dotnet/roslyn` |
| .NET runtime tarball (build-time only, not shipped) | not read in this spike |

## 14. Maintenance risks

| Risk | Evidence | Mitigation |
| --- | --- | --- |
| Runtime migration Mono → CoreCLR for WebAssembly | dotnet/runtime "NET WebAssembly on CoreCLR interpreter" targets an early preview in .NET 11 and "stability, performance, and a seamless transition" in .NET 12 ([#121511](https://github.com/dotnet/runtime/issues/121511)); "WASM continues to use Mono, and that is not changing in .NET 11" ([.NET blog, 2026-05-13](https://devblogs.microsoft.com/dotnet/dotnet-maui-moves-to-coreclr-in-dotnet-11/)) | stay on .NET 10 LTS until 2028; re-run this spike on the .NET 12 browser runtime; keep the boot code behind one module |
| Hand-written boot config instead of SDK-generated `dotnet.boot.js` | `MonoConfig`/`Assets` are public types in `dotnet.d.ts`, but the default loader failed in the browser (§2) | pin the runtime pack; unit test the boot in Node and Chromium on every bump |
| Roslyn versions | 5.9.0 ran on runtime 10.0.14 (verified) | pin both; bump together |
| Size growth | 7–13 MiB Brotli vs Pyodide 5.2 MiB (§3) | curated sets; download only on a C# challenge |
| Cold compile ≈ 1.2–2.4 s on the interpreter | §4 | warm worker, pre-warm compile |
| No AOT/trim without SDK | §2 | accept, or revisit path B later |
| Single maintainer knowledge (C# host + JS boot) | — | document in ARCHITECTURE.md; regression tests |

## 15. Not verified / not available

- Firefox, Safari, mobile browsers; memory use in the browser.
- Real network download times, the host's Brotli/content-encoding for `.dll`/`.wasm`.
- Async tests, threads, timers, `Thread.Sleep` on the single-threaded runtime.
- Escape scan of runtime JS closures (C3); reflection reaching `JSHost` when its reference is withheld.
- Running ILLink without the SDK; lazy assembly loading (`lazyAssembly`).
- Published Microsoft figures for Roslyn compile time in wasm: none found.
- Permission-model child process for verify.

## Sources

- Runtime pack API: `dotnet.d.ts` inside `Microsoft.NETCore.App.Runtime.Mono.browser-wasm` 10.0.14 (nuget.org)
- <https://api.nuget.org/v3-flatcontainer/microsoft.netcore.app.runtime.mono.browser-wasm/index.json>, <https://api.nuget.org/v3/registration5-semver1/microsoft.netcore.app.runtime.mono.browser-wasm/index.json>, <https://api.nuget.org/v3/catalog0/data/2026.10.25.18.18.28/microsoft.netcore.app.runtime.mono.browser-wasm.10.0.14.json>
- <https://builds.dotnet.microsoft.com/dotnet/release-metadata/10.0/releases.json>, <https://builds.dotnet.microsoft.com/dotnet/release-metadata/releases-index.json>
- <https://learn.microsoft.com/en-us/aspnet/core/blazor/security/content-security-policy?view=aspnetcore-10.0>
- <https://learn.microsoft.com/en-us/aspnet/core/blazor/host-and-deploy/webassembly/?view=aspnetcore-10.0>
- <https://docs.netlify.com/build/configure-builds/available-software-at-build-time/>
- <https://github.com/MicrosoftLearning/c-sharp-minor>, <https://microsoftlearning.github.io/c-sharp-minor/>
- <https://github.com/jjonescz/DotNetLab>, <https://lab.razor.fyi/>
- <https://github.com/dotnet/try/issues/1285>
- <https://strathweb.com/2019/06/building-a-c-interactive-shell-in-a-browser-with-blazor-webassembly-and-roslyn/>, <https://www.nuget.org/packages/Moka.Blazor.Repl>
- <https://github.com/dotnet/runtime/issues/121511>
- <https://devblogs.microsoft.com/dotnet/dotnet-maui-moves-to-coreclr-in-dotnet-11/>
