# Observability, SLOs & Error Budgets

Shipping a system is where owning it starts: someone must know, before users complain, whether it serves people well, and decide with numbers when to stop shipping features and work on reliability. This lesson covers the signals that make a system observable, how one request is followed across services, the service level vocabulary, error budgets and the burn-rate alerts that wake a human only when the budget is really at risk.

You need: Client-Server Architecture & HTTP Basics (status codes), Scaling from Zero to One Million Users (centralized logs and metrics), Resilience: Circuit Breakers, Retries & Bulkheads (timeouts and retries) and Discord Architecture: ScyllaDB, Rust & Tail Latency (p99 latency).

## Logs, metrics and traces

**Observability** is the ability to understand a system's internal state from its outputs, carried by three kinds of telemetry:

| Signal | What it records | Best for |
| --- | --- | --- |
| **Logs** | one timestamped record per event, ideally structured (`order_id`, `user_id`) | what exactly happened to one request |
| **Metrics** | numbers aggregated over time (counters, gauges, histograms); each distinct label value is a new time series | dashboards and alerts |
| **Traces** | one request's path through every service, as a tree of spans | where the time went and which call failed |

A **span** is one unit of work, such as an HTTP handler or a database query, with a name, start and end times, attributes and the id of its parent span. A **trace** is every span of one request.

## Distributed tracing and context propagation

A trace survives only if every service passes the request's identity along: when service A calls B, it sends the trace id and its own span id, and B starts its span in the same trace with A's span as parent. **OpenTelemetry**, the open-source, vendor-neutral standard for producing telemetry (APIs, SDKs, a wire protocol and a collector, but no storage backend), propagates this context by default in the W3C Trace Context `traceparent` header:

```text
traceparent: 00-a0892f3577b34da6a3ce929d0e0e4736-f03067aa0ba902b7-01
             version, trace id (16 bytes), parent span id (8 bytes), flags
```

The same context travels in message attributes through queues and into every log line, so a slow trace links straight to its logs; one proxy that drops it splits the trace in two. Storing every trace is expensive, so traces are **sampled**: head sampling decides at the first span, tail sampling after the trace completes, so it can keep every error and every slow request.

## The four golden signals

The Google SRE book names four signals for any user-facing service:

- **Latency**: the time to serve a request; track failures separately, since a slow error is worse than a fast one.
- **Traffic**: the demand, such as requests per second.
- **Errors**: failed requests, explicit (`500`), implicit (a `200` with wrong content) or by policy (too slow).
- **Saturation**: how full the most constrained resource is; rising latency is often its first symptom.

Measure latency as **percentiles**, never only an average: an average of 100 ms can hide 1% of requests taking 5 seconds, and a page that waits for 100 backends hits at least one backend's p99 on 63% of its loads. Count requests in latency buckets (a histogram) so any percentile can be estimated later.

## SLI, SLO and SLA

- A **service level indicator (SLI)** is a measurement, best written as a ratio of good events to all events: the share of checkout requests that succeed in under 300 ms, measured at the load balancer.
- A **service level objective (SLO)** is the target for an SLI over a window: 99.9% over a rolling 30 days.
- A **service level agreement (SLA)** is a contract with consequences, such as service credits, when a target is missed; keep it looser than the internal SLO so the team reacts first.

Never aim at 100%: it cannot be reached, users cannot tell 99.99% from 99.999% through a phone and network that fail far more often, and each extra nine may cost a hundred times more than the last. Over 30 days, 99.9% allows 43.2 minutes of total outage; 99.999%, only 26 seconds.

## Error budgets

The **error budget** is 1 − SLO, the failures the target tolerates over its window: a 99.9% SLO over 1,000,000 requests allows 1,000 failed requests. An **error budget policy**, agreed in advance, turns the argument between shipping and stability into a rule: while budget remains, releases continue; once it is spent, only fixes and security patches ship until the service is back within its SLO. Google reports that roughly 70% of its outages come from changes, so the budget governs release velocity directly.

## Burn rate and multi-window alerts

The **burn rate** is how fast the budget is being spent: the error rate of a recent window divided by the error rate the SLO allows. At burn rate 1 the budget runs out exactly at the end of the SLO window; at 14.4, one hour spends 2% of a 30-day budget (14.4 × 1 hour / 720 hours).

Raw counts make poor alerts: 150 errors in an hour is a 1.5% error rate at 10,000 requests per hour and 0.015% at 1,000,000. Paging whenever the 10-minute error rate exceeds the SLO is not much better: it can fire 144 times a day while the SLO is still met. The Google SRE workbook recommends **multiwindow, multi-burn-rate** alerts, starting from these values for a 99.9% SLO:

| Severity | Long window | Short window | Burn rate | Budget spent |
| --- | --- | --- | --- | --- |
| page | 1 hour | 5 minutes | 14.4 | 2% |
| page | 6 hours | 30 minutes | 6 | 5% |
| ticket | 3 days | 6 hours | 1 | 10% |

A rule fires only when **both** windows exceed its burn rate. The long window proves a significant share of the budget is gone; the short one, a twelfth of its length, proves the burn is still happening, so the page stops minutes after the fix instead of an hour later. Very quiet services need synthetic traffic or grouping with related services: at 10 requests an hour, one failure is a 10% error rate.

## Common mistakes

- **Alerting on raw error counts instead of error-budget burn.** A fixed "more than 100 errors in five minutes" ignores traffic: it pages for harmless noise at peak and stays silent through a real outage at night, when too few requests arrive to reach the count. Page on SLO burn over a long and a short window.
- **Watching averages instead of percentiles**: the mean stays flat while the slowest requests, the ones users remember, get worse.
- **A 100% target**: no budget is left to release with, and the target is missed anyway.
- **Dropping the trace context at one hop**: a queue or proxy that does not forward `traceparent` cuts every trace there.

## In practice

Give every service a one-page SLO document: what counts as a good event and where it is measured, the target and window, the error budget policy and the alert rules. Instrument with OpenTelemetry so all signals share trace ids, chart the golden signals per endpoint, and page only on budget burn; everything else becomes a ticket.

## Check yourself

1. A 99.95% SLO, 4,000,000 requests in the 30-day window and 1,500 failures: how much budget remains, and may the team keep releasing?
2. Why does the fast-burn page require both the 1-hour and the 5-minute window above a burn rate of 14.4?
3. Average latency is flat, but users say an endpoint got slower. What do you measure instead, and why?
