# Performance and Memory

After this lesson you can reason about where a .NET service spends memory and CPU. You will know the basics of the garbage collector, find allocations on a hot path, remove them with `Span<T>`, `ArrayPool<T>` and `StringBuilder` where that pays off, and prove the change with BenchmarkDotNet instead of guessing.

You need: 00/04 (strings and `StringBuilder`), 03/02 (LINQ), 04/02 (async), 04/03 (`try`/`finally` and disposal), 05/01 (one process, many requests) and 07/04 (query performance).

## One process, many requests

Most performance problems in a backend are not in this lesson: slow queries and missing caches (module 07) dwarf everything here. Fix those first.

What this lesson adds is memory. A .NET API is one long-running process that allocates objects for every request on a shared, garbage-collected heap. Allocation itself is cheap, but each allocation brings the next collection closer, and collections consume CPU and can pause threads for every request in flight. Two opposite habits cause trouble: allocating freely on hot paths (string splitting, `ToList()` everywhere, building large strings with `+=`), and rewriting code with spans and pools without measuring first.

## The GC in five facts

- New objects go to **generation 0**. Most die there, and gen 0 collections are fast. Survivors are promoted to gen 1, then gen 2. A gen 2 collection walks the whole heap and is the expensive one.
- Objects of **85,000 bytes or more** go to the **large object heap** (LOH), collected only with gen 2 and not compacted by default (except under a container memory limit, where the runtime compacts it automatically). Microsoft's ASP.NET Core memory page shows an endpoint that allocates just over the limit per request causing constant gen 2 collections and roughly halving throughput.
- **Server GC** is the default for ASP.NET Core apps: one heap and GC thread per core, tuned for throughput. Standalone console apps default to workstation GC unless you set `<ServerGarbageCollection>true</ServerGarbageCollection>`. Microsoft notes that workstation GC can be the better choice when many containerized apps share one machine.
- Since .NET 9, **DATAS** (dynamic adaptation to application sizes) is on by default for Server GC. It starts with one heap and grows the number of heaps with load, which keeps small containers from reserving memory for every core.
- A "leak" in .NET is almost always a reference you still hold: a static dictionary, an event handler, a cache without limits. Lesson 03 shows how to find it.

## Measure first: BenchmarkDotNet

Never optimize from intuition. BenchmarkDotNet (MIT licence, a .NET Foundation project) runs warm-up, many iterations and statistics, and its `[MemoryDiagnoser]` adds allocated bytes and GC counts per operation.

```csharp
using BenchmarkDotNet.Attributes;
using BenchmarkDotNet.Running;

BenchmarkRunner.Run<SkuParsing>();

[MemoryDiagnoser]
public class SkuParsing
{
    private const string Line = "SKU-1042;Blue mug;12;19.90";

    [Benchmark(Baseline = true)]
    public int WithSplit() => int.Parse(Line.Split(';')[2]);

    [Benchmark]
    public int WithSpan()
    {
        ReadOnlySpan<char> rest = Line;
        for (var i = 0; i < 2; i++)
            rest = rest[(rest.IndexOf(';') + 1)..];
        return int.Parse(rest[..rest.IndexOf(';')]);
    }
}
```

Run it with `dotnet run -c Release`: the BenchmarkDotNet guide requires a Release build without a debugger attached. `Split` allocates an array and four strings per call; the span version allocates nothing. Whether that matters depends on how many lines you parse, which is exactly what the numbers tell you.

## `Span<T>` and `Memory<T>`

`Span<T>` and `ReadOnlySpan<T>` are views over contiguous memory (an array, a string, a `stackalloc` buffer) that slice without copying. They are `ref struct` types and live only on the stack: you cannot store them in a class field, box them, or keep one alive across an `await`. When you need the view on the heap or across an await, use `Memory<T>` and take `.Span` inside a synchronous section. Microsoft's guideline: for a synchronous API, accept `Span<T>` or `ReadOnlySpan<T>` parameters; use the read-only variants when you do not write.

## `ArrayPool<T>` for temporary buffers

```csharp
using System.Buffers;

public static async Task<long> CountBytesAsync(Stream input, CancellationToken ct)
{
    var buffer = ArrayPool<byte>.Shared.Rent(64 * 1024); // may return a larger array
    try
    {
        long total = 0;
        int read;
        while ((read = await input.ReadAsync(buffer.AsMemory(0, 64 * 1024), ct)) > 0)
            total += read;
        return total;
    }
    finally
    {
        ArrayPool<byte>.Shared.Return(buffer);
    }
}
```

Renting a buffer instead of `new byte[64 * 1024]` per call keeps it out of gen 0 and, for sizes over the limit, off the LOH. The rules: the rented array can be longer than asked, so track the length you use; always return it in `finally`; never use it after returning it; and pass `clearArray: true` if it held sensitive data.

## `StringBuilder` and strings

Strings are immutable, so `s += part` in a loop copies the whole string each time. Use `StringBuilder` when you build a string in a loop or across many steps. For a fixed handful of parts, interpolation (`$"{sku}-{size}"`) is already efficient: the compiler uses `DefaultInterpolatedStringHandler` and does not create intermediate strings. Do not replace readable interpolation with a `StringBuilder` for two values.

## Common mistakes

- **Trusting the length of a rented array.** `Rent(4096)` may return a larger array that still holds another caller's bytes, so code that loops to `buffer.Length` processes garbage. Track the count you asked for or the count `Read` returned.
- **Returning a pooled array twice, or not at all.** A double `Return` hands one array to two callers, who overwrite each other's data; a missing one turns the pool into plain allocation. Return once, in `finally`.
- **Benchmarking a Debug build with a `Stopwatch` loop.** No optimizations and no warm-up make the numbers meaningless. Use BenchmarkDotNet in Release.
- **A large buffer allocated per request.** Every allocation of 85,000 bytes or more lands on the LOH and drives gen 2 collections. Rent it from `ArrayPool<T>`.

## In practice

- Fix the big costs first: N+1 queries, missing `AsNoTracking`, unbounded result sets, chatty HTTP calls. Then look at allocations on paths that run thousands of times per second.
- Use `dotnet-counters` (lesson 03) in production to see allocation rate and GC counts, BenchmarkDotNet locally to compare two implementations, and keep the benchmark in the repository so the next change can be measured too.
- Keep spans and pools inside hot, well-tested helpers such as parsers and serializers. Business code stays plain.
- Do not call `GC.Collect()` to "free memory"; it forces an expensive collection and usually hides a real reference leak.
- Try it locally: run the `SkuParsing` benchmark with `dotnet run -c Release`, then change one method and compare the `Allocated` column.

## Status as of 2026-11-05

- BenchmarkDotNet 0.15.8 is the latest stable release on NuGet; 0.16.0 is in preview.

## Check yourself

1. Why does a per-request allocation of 90,000 bytes hurt more than one of 80,000 bytes?
2. When must you use `Memory<T>` instead of `Span<T>`?
3. A teammate claims a `StringBuilder` refactoring made an endpoint faster. What would you ask to see before merging?
