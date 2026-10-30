Turn simulated performance traces into the numbers you would compare between rendering models. `traces.js` (done) exports `traces`: one trace per model (`SPA`, `SSR`, `SSG`, `Islands`) for the same product page. Write the two functions in `metrics.js`.

A trace is `{ events }`, in **any order**. Every event has a `type` and a `time` in milliseconds since navigation start:

| `type` | Extra fields | Meaning |
| --- | --- | --- |
| `'response-start'` | | First byte of the HTML |
| `'first-contentful-paint'` | | First text or image painted |
| `'largest-contentful-paint'` | `element` | An LCP candidate |
| `'long-task'` | `duration` | A main-thread task (it starts at `time`) |
| `'script'` | `size` (bytes), `url` | A JavaScript file downloaded |
| `'input'` | | A user interaction |

**`summarizeTrace(trace, { tti } = {})`** (named export) returns `{ ttfb, fcp, lcp, tbt, javascriptBytes }`:

- `ttfb`: the earliest `response-start` time; `fcp`: the earliest `first-contentful-paint` time.
- `lcp`: the **latest** `largest-contentful-paint` candidate whose time is **before the first `input`** (all candidates when there is no input).
- `ttfb`, `fcp` and `lcp` are `null` when the trace has no matching event.
- `tbt`: for every `long-task` that starts at or after FCP and before `tti` (default: no limit, the end of the trace), add `duration - 50` when positive, and sum. `LONG_TASK_THRESHOLD` is exported as `50`.
- `javascriptBytes`: the sum of `size` over the `script` events (`0` when there are none).

**`compareModels(tracesByModel)`** (named export) takes an object `{ modelName: trace }` and returns `{ rows, fastest }`:

- `rows`: one `{ model, ttfb, fcp, lcp, tbt, javascriptBytes }` per model, sorted by `lcp` ascending; rows with `lcp: null` go last; ties keep the input order.
- `fastest`: for each metric in `METRICS` (`ttfb`, `fcp`, `lcp`, `tbt`, `javascriptBytes`), the `model` with the lowest non-null value. On a tie, the model that comes first in `rows` wins; `null` when no model has a value.

With the sample traces the rows come out as `Islands`, `SSG`, `SSR`, `SPA`, and the SPA wins only TTFB.
