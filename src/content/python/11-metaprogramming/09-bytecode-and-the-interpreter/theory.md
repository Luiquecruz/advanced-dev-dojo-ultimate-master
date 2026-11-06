CPython never runs your source text directly. It compiles each module once into **code objects**, caches them as `.pyc` files, and executes them on a stack-based virtual machine whose instructions rewrite themselves for the types they actually see. Knowing that pipeline explains startup cost, why `.pyc` files are tied to one version, and why tools must not depend on bytecode.

```py
def add(a, b):
    return a + b

code = add.__code__          # a code object: immutable, shared by every call
code.co_varnames             # ('a', 'b')
code.co_qualname             # 'add'
```

Two expectations to correct early. Hot Python code does not automatically become machine code: in CPython the main speedup is still the **interpreter**, which since 3.11 specializes individual instructions in place, while the JIT is experimental and off by default. And although the bytecode is one `import dis` away, which tempts people to build tools on it, it is an implementation detail with no compatibility guarantee.

## The compile pipeline

1. **Tokenize and parse**: the PEG parser (3.9) turns source into an abstract syntax tree, the same tree `ast.parse` returns.
2. **Symbol table**: every name is classified as local, global, free (from an enclosing function) or cell (captured by an inner one), before anything runs. That is why a name assigned anywhere in a function is local in all of it, and reading it before the assignment raises `UnboundLocalError`.
3. **Compile and optimize**: the compiler builds a control-flow graph, folds constants (`24 * 60 * 60` is stored as `86400`), removes dead code and assembles the instructions.
4. **Code object**: instructions (`co_code`), constants, names, the exception table and source positions (`co_positions()`, used for the `^^^^` markers in tracebacks since 3.11).

On import, the finder looks for `__pycache__/orders.cpython-314.pyc`. Its header holds a **magic number** that changes whenever the bytecode format changes, plus the source's modification time and size (or a hash, PEP 552). If everything matches, the code object is loaded without compiling; otherwise the module is compiled and the cache rewritten when the directory is writable. A function object is a code object plus its globals, defaults and closure cells.

## The specializing adaptive interpreter

PEP 659 (3.11) makes instructions **adaptive**. A generic instruction such as `BINARY_OP` counts its executions; once warm, it replaces itself with a specialized form for the types it observed, guarded by a cheap check and backed by inline caches (an attribute's offset, a type version). When a guard fails, the instruction falls back to the generic path, and after repeated misses it specializes again for the new types. Results never change: only speed does. The output below was measured on CPython 3.14; other versions print different names.

```text
dis.dis(add)                                  # before any call
  LOAD_FAST_BORROW_LOAD_FAST_BORROW 1 (a, b)
  BINARY_OP                0 (+)
  RETURN_VALUE

dis.dis(add, adaptive=True)                   # after 1 000 calls with ints
  LOAD_FAST_BORROW_LOAD_FAST_BORROW 1 (a, b)
  BINARY_OP_ADD_INT        0 (+)
  RETURN_VALUE
```

After 1 000 more calls with strings, the same instruction shows `BINARY_OP_ADD_UNICODE`. Attribute reads specialize the same way (`LOAD_ATTR_INSTANCE_VALUE`), which is why code that keeps types stable at a given line runs faster than code that mixes them.

## Why bytecode is not an API

The `dis` documentation states it: bytecode may be added, removed or changed between versions. Python 3.14 alone added `LOAD_FAST_BORROW` and `LOAD_SMALL_INT`, folded `BINARY_SUBSCR` into `BINARY_OP` and removed `RETURN_CONST`. Tools that pattern-match opcodes break on every minor release. Use `ast` to analyze source, `inspect` for callables and `sys.monitoring` (PEP 669, 3.12) for coverage and profiling hooks.

## The JIT and free threading

The JIT (PEP 744) sits above the specializing interpreter. When specialized bytecode gets hot, a trace of it is translated into **micro-ops**, optimized, and turned into machine code by **copy-and-patch**: templates compiled ahead of time with LLVM are copied into memory and their holes patched with runtime values, so end users need no compiler. It changes speed, never semantics, and it adds no parallelism.

Free threading (PEP 703) removes the GIL in a separate build. Specialization rewrites bytecode that every thread shares, so it had to be made thread-safe first: the 3.14 release notes announce that the specializing interpreter is "now enabled in free-threaded mode", bringing the single-threaded penalty down to roughly 5–10%.

> **Status as of November 2026:** Python 3.15 (released 9 October 2026) is the latest release; this track runs CPython 3.14 in Pyodide, where specialization is active and `sys._jit.is_available()` returns `False`. In 3.14 the JIT is experimental: the official Windows and macOS binaries include it, disabled unless `PYTHON_JIT=1`, with a measured impact from 10% slower to 20% faster, and free-threaded builds do not support it; `sys._jit` (new in 3.14) reports availability and state. The 3.15 notes report a 7–8% geometric-mean JIT speedup on x86-64 Linux with a new tracing frontend. PEP 744 is still a Draft; free-threaded builds have been supported but optional since 3.14 (PEP 779).

## When to choose it

- **Read `dis` output** to understand a performance difference or a scoping surprise on one specific version, never as a test oracle.
- **Keep types stable** in hot loops; that is what the specializer rewards.
- **Ship `.pyc` files** compiled by the exact interpreter that runs them, or let the runtime write its own cache.
- **Try the JIT or a free-threaded build** only with a benchmark of your own workload, and keep the default build when the numbers do not justify it.
