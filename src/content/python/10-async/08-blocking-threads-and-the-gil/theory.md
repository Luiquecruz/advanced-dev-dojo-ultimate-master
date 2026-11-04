The event loop runs on **one thread** and switches tasks only at an `await`. Any call that does not yield, a `time.sleep(1)`, a synchronous HTTP client, a large `json.loads`, a loop crunching numbers, **blocks every task** for its whole duration: no other coroutine runs, no timeout fires, no request is answered.

```py
import asyncio
import time

async def handler():
    time.sleep(0.2)                 # blocks the loop: every other task freezes for 200 ms
    await asyncio.sleep(0.2)        # suspends this task only: the loop keeps serving others

async def offloaded():
    await asyncio.to_thread(time.sleep, 0.2)   # blocking call moved to a worker thread
```

## Coming from TypeScript and JavaScript

Node has the same rule for CPU work: a `while` loop that runs for 200 ms freezes the event loop, and the fix is a `worker_threads` Worker or a separate process. The habit that breaks is I/O. In Node, almost every I/O API is non-blocking by design, and the slow parts of `fs`, `dns` and `crypto` run on libuv's thread pool for you. In Python, most libraries are **synchronous**: `requests`, `open().read()`, `sqlite3`, `time.sleep`, many database drivers. Calling them from a coroutine is the `fs.readFileSync` of asyncio, and nothing warns you.

```ts
await fs.promises.readFile(path);            // Node: off the loop automatically
```

```py
data = await asyncio.to_thread(Path(path).read_bytes)   # Python: you move it off the loop
```

## How it works

**Three ways out of the loop.**

- **`asyncio.to_thread(func, *args)`** (3.9) runs a blocking function in the loop's default thread pool and awaits its result; `loop.run_in_executor(executor, func)` is the general form that takes any `concurrent.futures` executor.
- **`ProcessPoolExecutor`** runs functions in worker processes. Arguments and results are pickled across the process boundary, so it suits CPU-heavy functions with small inputs and outputs.
- **`InterpreterPoolExecutor`** (3.14) runs functions in isolated interpreters inside the same process, each with its own GIL (PEP 734, `concurrent.interpreters`). Many third-party C extensions do not support it yet.

**The GIL.** On the default CPython build, the global interpreter lock lets only one thread execute Python bytecode at a time. Threads still help with **I/O-bound** work, because blocking I/O calls release the GIL while they wait. They do not speed up **CPU-bound** pure Python: two threads computing take as long as one. That is why CPU work goes to processes or interpreters.

**Free threading.** PEP 703 made the GIL optional through a separate build (`python3.13t`, `python3.14t`): threads run Python code in parallel on several cores. C extensions must declare support, otherwise the interpreter re-enables the GIL when it imports them. `sys._is_gil_enabled()` reports the state at runtime.

**The JIT** (PEP 744) compiles hot bytecode traces to machine code. It speeds up the interpreter; it does not add parallelism or make blocking calls non-blocking.

## In this sandbox

Pyodide runs CPython 3.14 compiled to WebAssembly inside a browser worker, with **no threads and no processes**. Measured here: `ThreadPoolExecutor.submit` raises `RuntimeError: can't start new thread`; `asyncio.to_thread` returns the right value but runs the function **synchronously on the loop**, so it proves nothing about non-blocking behavior; `time.sleep` really blocks the loop, and no asyncio timeout can interrupt it; `multiprocessing` and `concurrent.interpreters` are missing; `sys._is_gil_enabled()` is `True` and `os.cpu_count()` is `1`. That is why this topic is a quiz.

## Legacy vs modern

Before 3.9, offloading meant `loop.run_in_executor(None, func)` on the running loop; `to_thread` replaces it for the common case. In 3.14 the default start method of `multiprocessing` and `ProcessPoolExecutor` on Unix platforms other than macOS changed from `fork` to `forkserver`, so code that relied on workers inheriting module globals must pass state explicitly.

> **Status as of November 2026:** Python 3.15 (October 2026) is the latest release; this track runs 3.14. Free-threaded builds have been officially supported but optional since 3.14 (PEP 779, "phase II"); 3.15 adds a stable ABI for free-threaded builds (PEP 803, `abi3t`), and no date is set for making them the default. The JIT is still experimental: official Windows and macOS binaries of 3.14 include it, disabled unless `PYTHON_JIT=1`, and 3.15 reports a 7–8% geometric-mean speedup on x86-64 Linux. PEP 744 itself is still a Draft informational PEP. `concurrent.interpreters` and `InterpreterPoolExecutor` are new in 3.14.

## When to choose it

- **Stay on the loop** for I/O done through async libraries (`asyncio` streams, async HTTP and database clients).
- **`to_thread`** for a blocking call you cannot replace: a sync SDK, file reads, a C library that releases the GIL.
- **A process pool** (or, where your extensions allow it, an interpreter pool) for CPU-bound Python work such as parsing, hashing in pure Python or image transforms; size it from the measured CPU time per item and the cores you can spend.
- **A free-threaded build** only after checking that every C extension you import supports it; measure, because single-threaded code runs a few percent slower there.
