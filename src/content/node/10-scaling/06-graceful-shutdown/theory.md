# Graceful Shutdown

Servers are stopped all the time: every deploy, every autoscaling event, every node replaced by the cloud provider. The orchestrator (Kubernetes, ECS, Fly.io, systemd, Docker) asks politely first by sending **`SIGTERM`**, waits a grace period (30 seconds by default in Kubernetes, 10 for `docker stop`), then kills the process with **`SIGKILL`**, which cannot be caught. What your process does in that window decides whether users see a clean deploy or a burst of `502`s, half-written records and lost jobs.

## What "graceful" means

1. **Stop accepting new work.** Close the listening socket so new connections go to other instances. Mark readiness as failing so the load balancer stops routing here.
2. **Finish in-flight work.** Requests already being handled run to completion; workers finish (or release) their current job.
3. **Release resources.** Close database pools, flush log and metric buffers, disconnect from Redis and brokers.
4. **Exit** with code `0`, or `1` if something went wrong.
5. **Bound it with a timeout** shorter than the platform's grace period, so a stuck request cannot turn into a `SIGKILL` in the middle of cleanup.

## Signals in Node.js

```ts
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

`SIGINT` is Ctrl+C in a terminal. Registering a listener replaces Node's default behavior (exit immediately), so once you listen you **must** exit yourself. Two traps:

- **PID 1 in containers.** If the container starts with `npm start` or a shell script, `npm` or `sh` is PID 1 and may not forward signals to Node; the process gets `SIGKILL` after the grace period. Start with `node dist/server.js` (exec form `CMD ["node", "server.js"]`) or use an init such as `tini` or `docker run --init`.
- **Double signals.** Platforms and impatient humans send the signal again. The shutdown must be **idempotent**: the second signal must not close twice or run cleanup twice.

## `server.close()` drains, it does not cut

`server.close(callback)` stops listening immediately and calls `callback` once every existing connection has ended, so in-flight requests finish. Keep-alive connections can keep it waiting even when idle; Node 19+ closes idle keep-alive connections on `close()`, and `server.closeIdleConnections()` / `closeAllConnections()` exist for older versions or the forced path.

```ts
async function shutdown(signal: string) {
  logger.info(`Received ${signal}`);
  const timer = setTimeout(() => process.exit(1), 10_000);
  timer.unref();
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  await db.end();
  clearTimeout(timer);
  process.exit(0);
}
```

The timer is `unref()`'d so it never keeps a process alive that would otherwise have ended, and cleared once the clean path finished.

## Readiness and the load balancer race

Even after `SIGTERM`, a load balancer may keep sending requests for a few seconds until it notices the pod is going away. Two common mitigations: fail the **readiness** probe (`/ready` returns `503` once shutting down) and, in Kubernetes, wait a few seconds before closing the server (a `preStop` sleep or a short delay in code) so endpoints are removed first. **Liveness** should keep passing during shutdown; failing it makes the platform kill the process early.

## Long-lived work

- **WebSockets and SSE** never "finish": close them deliberately with a reason so clients reconnect to another instance.
- **Job workers** should stop taking new jobs, then wait for the current job or put it back (BullMQ's `worker.close()` does this; leases make unfinished jobs reappear elsewhere).
- **Batches and streams** should checkpoint progress so the next instance resumes instead of starting over.

## Frameworks and helpers

Fastify has `fastify.close()` with `onClose` hooks; NestJS has `enableShutdownHooks()`; libraries such as `close-with-grace` and `@godaddy/terminus` wrap signals, timeouts and health checks. They all implement the steps above, so knowing the steps lets you review them.

## When to choose it

Every long-running server or worker needs a shutdown handler; the only question is how much it does. Stateless HTTP APIs need signal handling, `server.close()`, pool cleanup and a timeout. Add readiness failing and a short pre-close delay behind load balancers. Add job draining for workers and connection closing for real-time servers. Serverless functions are the exception: the platform manages the lifecycle, though some offer shutdown hooks for flushing telemetry.

## Working with AI

Tell the assistant the platform, its grace period and which resources the process holds (pools, queues, sockets). Review generated shutdown code for:

- No `SIGTERM` handler, or a handler that never calls `process.exit`.
- `process.exit()` called immediately, without waiting for `server.close()`.
- No timeout, or a timeout longer than the platform's grace period.
- Not idempotent: two signals run cleanup twice.
- Timers left referenced (`unref()` missing) or never cleared.
- `npm start` as the container command, so signals never reach Node.
