# Worker Threads and Clustering

One Node.js process runs JavaScript on one thread and therefore uses **one CPU core** for your code. A server with 8 cores running a single Node process leaves 7 of them mostly idle. There are two different problems hiding here, and they have different answers:

1. **Throughput:** handle more requests per second. Answer: run **more processes** (cluster, PM2, or more containers).
2. **CPU-heavy tasks:** one request needs seconds of computation. Answer: move that computation to **worker threads** (or another service) so the main thread keeps serving.

## What already runs in parallel

Node is not purely single-threaded. libuv keeps a **thread pool** (4 threads by default, `UV_THREADPOOL_SIZE` up to 1024) for file system calls, DNS lookups, and the async variants of `crypto` (`pbkdf2`, `scrypt`) and `zlib`. Network sockets use the operating system's async I/O and need no threads at all. So "use the async API" is the first parallelism tool, and the cheapest.

## Worker threads

`node:worker_threads` starts additional V8 isolates in the same process. Each worker has its own event loop and heap; they communicate by **messages**.

```ts
import { Worker } from 'node:worker_threads';

function resizeInWorker(image: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./resize-worker.js', { workerData: image });
    worker.once('message', resolve);
    worker.once('error', reject);
  });
}
```

```ts
import { parentPort, workerData } from 'node:worker_threads';

parentPort!.postMessage(resize(workerData));
```

Things to know:

- **Messages are copied** with the structured clone algorithm (like `postMessage` to a Web Worker in the browser). Large `ArrayBuffer`s can be **transferred** (moved without copying) through the transfer list; `SharedArrayBuffer` plus `Atomics` allows true shared memory, rarely needed in application code.
- **Starting a worker is expensive** (tens of milliseconds, its own heap). Never start one per request: use a **pool** such as Piscina, which keeps N workers alive and queues tasks.
- **Pool size ≈ number of cores** (`os.availableParallelism()`). More CPU-bound workers than cores only adds context switching.
- Workers do not help with I/O-bound work. A slow database query is waiting, not computing.

The frontend analogy is exact: Web Workers keep the UI thread responsive; worker threads keep the event loop responsive.

## Clustering: more processes

`node:cluster` forks the same program N times. The primary process accepts connections on one port and hands them to the workers (round-robin on Linux). Each worker is a full Node process with its own memory.

```ts
import cluster from 'node:cluster';
import { availableParallelism } from 'node:os';

if (cluster.isPrimary) {
  for (let index = 0; index < availableParallelism(); index++) cluster.fork();
  cluster.on('exit', () => cluster.fork());
} else {
  startServer();
}
```

PM2 does the same from the command line (`pm2 start app.js -i max`) and adds restarts and log management.

**Processes share nothing.** An in-memory session store, rate limiter, cache or job queue becomes N independent copies: a user rate-limited on worker 1 is fresh on worker 2, and a WebSocket broadcast only reaches the clients of one process. Shared state must move to Redis or the database. This is the same constraint as running several containers, so designing for it early pays off twice.

## Containers changed the default

On Kubernetes, ECS, Cloud Run or Fly.io, the usual pattern is **one Node process per container** and the platform runs many containers. The orchestrator already restarts crashed processes, balances load and scales on CPU. Running `cluster` inside a container duplicates that work and confuses resource limits and metrics. Cluster and PM2 remain useful on a single VM or bare metal.

| Tool | Unit | Shares memory | Use it for |
| --- | --- | --- | --- |
| Async APIs (libuv pool) | thread | n/a | crypto, compression, file I/O |
| `worker_threads` + pool | thread | only via messages or `SharedArrayBuffer` | CPU-heavy tasks inside a request or job |
| `child_process` | process | no | running external programs (ffmpeg, git) |
| `cluster` / PM2 | process | no | using all cores on one machine |
| More containers / instances | process (and machine) | no | horizontal scaling in the cloud |

## When to choose it

Start by not blocking: async APIs, smaller payloads, work in the database. If one task is CPU-heavy and must stay in the request, use a **worker pool**; if the user does not need to wait, use a **background job** whose workers can run on separate machines. For throughput, scale **horizontally** with more instances (containers in the cloud, cluster or PM2 on a VM), after making the app stateless. Consider a different runtime or language for a service that is dominated by heavy computation.

## Working with AI

Tell the assistant how you deploy (containers or a VM) and whether the work is CPU-bound or I/O-bound. Review generated code for:

- `new Worker(...)` per request instead of a pool.
- Worker threads used to "speed up" database or HTTP calls.
- Huge objects posted to workers on every task instead of transferring buffers or sending ids.
- `cluster` inside a container that the orchestrator already replicates.
- In-memory state (sessions, rate limits, caches, sockets) that silently breaks with several processes.
