# Concurrency Basics

Concurrency means several tasks make progress at overlapping times: a server answering many requests, or a program fetching two prices at once. Java gives you threads, executors, `CompletableFuture` and, since Java 21, virtual threads. The hard part is not starting tasks but sharing data safely between them. This lesson covers the building blocks, then shows why shared mutable state fails and how to fix it.

You need: Interfaces and Generics (lambdas, functional interfaces), Collections (method references such as `Integer::sum`), Exceptions in Depth (`try`-with-resources, `AutoCloseable`).

## Threads

A `Thread` runs a `Runnable`, a functional interface whose single method takes nothing and returns nothing, alongside the main thread. `start()` begins execution and `join()` waits for the thread to finish:

```java
Thread thread = Thread.ofPlatform().name("worker").start(
        () -> System.out.println("hello from " + Thread.currentThread().getName()));
thread.join();    // prints: hello from worker
```

`join()` throws the checked `InterruptedException`, so the enclosing method declares it. A platform thread is backed by an operating system thread, which is costly, so programs do not create one per small task.

## ExecutorService

An `ExecutorService` owns a set of threads and runs submitted tasks. Since Java 19 it is `AutoCloseable`, so try-with-resources waits for submitted tasks and shuts it down:

```java
try (ExecutorService executor = Executors.newFixedThreadPool(4)) {
    Future<Integer> future = executor.submit(() -> 6 * 7);
    System.out.println(future.get());    // 42
}
```

`submit` accepts a `Callable`, which returns a value and may throw. The `Future` represents the pending result, and `get()` blocks until it is ready. If the task threw, `get()` throws an `ExecutionException` whose cause is the original exception. Choose the pool size by the work: CPU-bound tasks fit a pool near the number of cores, while tasks that mostly wait are better served by virtual threads, described next.

## CompletableFuture

`CompletableFuture` chains steps without blocking at each one:

```java
CompletableFuture<Integer> price = CompletableFuture.supplyAsync(() -> 100);
CompletableFuture<Integer> tax = CompletableFuture.supplyAsync(() -> 20);

String result = price.thenCombine(tax, Integer::sum)
        .thenApply(total -> "total " + total)
        .join();                              // total 120
```

`supplyAsync` runs on a shared pool, `thenApply` transforms the result, `thenCombine` waits for two futures, and `join()` returns the value. A failure inside any step surfaces from `join()` as a `CompletionException` with the original as its cause, and `exceptionally(error -> "fallback")` supplies a replacement value.

## Virtual threads

A virtual thread is a lightweight thread managed by the JDK. When it blocks, for example waiting for a database or network call, the JDK releases the underlying operating system thread for other work. You can create one per task instead of pooling:

```java
try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
    for (int i = 0; i < 1000; i++) {
        executor.submit(() -> {
            Thread.sleep(10);       // blocks cheaply
            return null;
        });
    }
}
```

This runs 1,000 blocking tasks without 1,000 operating system threads. Virtual threads are final since Java 21. They help programs whose tasks mostly wait; they do not make CPU-bound work faster. Do not pool them. Since Java 24, including Java 25, blocking inside a `synchronized` block no longer pins the virtual thread to its carrier. Structured Concurrency, an API for grouping subtasks, is still a preview feature in Java 25 and needs `--enable-preview`, so this course does not use it.

## Shared mutable state

When two threads change the same variable, updates can be lost. `count++` reads, adds and writes in three steps, and the steps of two threads interleave:

```java
class Unsafe {
    int count;
    void increment() { count++; }
}
```

Two threads each calling `increment()` 100,000 times usually leave `count` below 200,000, and the result differs from run to run. The usual fixes are `synchronized`, which lets one thread at a time into a method or block, and atomic classes:

```java
class Locked {
    private int count;
    synchronized void increment() { count++; }
    synchronized int count() { return count; }
}

AtomicInteger atomic = new AtomicInteger();
atomic.incrementAndGet();
```

Both give exactly 200,000. Reads need the same lock as writes; otherwise a thread may not see the latest value.

## Immutability

The simplest fix is to share nothing that changes. A record, or a class whose fields are all `final` and refer only to immutable values (numbers, `String`, or a `List.copyOf` copy), can be passed between threads freely, because no thread can modify it. Replace a shared mutable counter with tasks that return values and combine the results in one place, as `thenCombine` does above.

## Common mistakes

- Reading and writing a shared field from several threads with no synchronization, so updates are lost and a test passes only some of the time.
- Calling `future.get()` immediately after each `submit`, which makes the tasks run one after another. Submit all tasks first, then collect the results.
- Creating a new platform thread for every small task instead of using an executor.
- Putting virtual threads in a fixed pool or expecting them to speed up CPU-heavy loops.

## In practice

Prefer executors over raw threads, return values instead of mutating shared variables, and make shared data immutable. When state must change, keep it behind one class and use `synchronized` or an atomic type. Treat a bug that appears "sometimes" as a concurrency bug until proven otherwise.

## Check yourself

1. Why can two threads incrementing an `int` lose updates?
2. What happens when a task submitted to an executor throws, and how do you see it?
3. When do virtual threads help, and when do they not?
