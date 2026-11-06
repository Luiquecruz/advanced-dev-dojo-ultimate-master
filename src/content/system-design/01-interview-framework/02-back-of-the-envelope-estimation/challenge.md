Turn the scale numbers of a design discussion into capacity targets. Everything is plain arithmetic, but the order of the steps and the rounding are part of the contract, so the same input always gives the same estimate.

```ts
interface CapacityInput {
  dailyActiveUsers: number;
  requestsPerUserPerDay: number;
  peakFactor: number;        // peak traffic ÷ average traffic, e.g. 2
  writeRatio: number;        // fraction of requests that are writes, between 0 and 1
  bytesPerWrite: number;     // bytes stored by one write
  retentionDays: number;     // how long written data is kept
  replicationFactor: number; // how many copies of each byte are stored
}

interface CapacityEstimate { averageQps: number; peakQps: number; writeQps: number; storageBytes: number }

export function estimateCapacity(input: CapacityInput): CapacityEstimate
export function formatBytes(bytes: number): string
```

`SECONDS_PER_DAY` (`86_400`) is already exported. Compute, in this order:

| Value | Formula |
| --- | --- |
| requests per day | `dailyActiveUsers × requestsPerUserPerDay` |
| writes per day | `Math.round(requests per day × writeRatio)`, rounded half up: `500.5` writes become `501` |
| `averageQps` | `Math.ceil(requests per day / 86,400)` |
| `peakQps` | `Math.ceil(requests per day × peakFactor / 86,400)`: apply the factor to the unrounded average, not to `averageQps` |
| `writeQps` | `Math.ceil(writes per day / 86,400)` |
| `storageBytes` | `writes per day × bytesPerWrite × retentionDays × replicationFactor` (no rounding needed) |

QPS values are rounded up because capacity is planned for at least the expected load. Every other rounding goes to the nearest value, and a value exactly halfway rounds up.

`formatBytes(bytes)` uses powers of 1,000 and the units `B`, `KB`, `MB`, `GB`, `TB`, `PB`: divide by 1,000 while the value is at least 1,000 and a larger unit exists, then round half up to one decimal place with `Math.round(value * 10) / 10` (1,250 bytes is `'1.3 KB'`) and print the number without a trailing `.0`. The unit is chosen before rounding, so a value that rounds up to 1,000 keeps its unit: 999,950 bytes is `'1000 KB'`. The number and the unit are separated by one space: `formatBytes(1_500)` is `'1.5 KB'`, `formatBytes(1_000)` is `'1 KB'`, `formatBytes(999)` is `'999 B'`, and values beyond 1,000 PB stay in `PB` (`'5000 PB'`).
