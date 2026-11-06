Turn the scale numbers of a design discussion into capacity targets. Everything is plain arithmetic, but the order of the steps and the rounding are part of the contract, so the same input always gives the same estimate.

```python
def estimate_capacity(
    *,
    daily_active_users,
    requests_per_user_per_day,
    peak_factor,         # peak traffic ÷ average traffic, e.g. 2
    write_ratio,         # fraction of requests that are writes, between 0 and 1
    bytes_per_write,     # bytes stored by one write
    retention_days,      # how long written data is kept
    replication_factor,  # how many copies of each byte are stored
) -> dict: ...           # {"average_qps": ..., "peak_qps": ..., "write_qps": ..., "storage_bytes": ...}


def format_bytes(byte_count) -> str: ...
```

Every argument of `estimate_capacity` is a keyword argument, and `SECONDS_PER_DAY` (`86_400`) is already defined. Compute, in this order:

| Value | Formula |
| --- | --- |
| requests per day | `daily_active_users × requests_per_user_per_day` |
| writes per day | `math.floor(requests per day × write_ratio + 0.5)`, rounded half up: `500.5` writes become `501` (`round()` would give `500`, because it rounds a half to the even number) |
| `"average_qps"` | `math.ceil(requests per day / 86,400)` |
| `"peak_qps"` | `math.ceil(requests per day × peak_factor / 86,400)`: apply the factor to the unrounded average, not to `"average_qps"` |
| `"write_qps"` | `math.ceil(writes per day / 86,400)` |
| `"storage_bytes"` | `writes per day × bytes_per_write × retention_days × replication_factor` (no rounding needed) |

QPS values are rounded up because capacity is planned for at least the expected load. Every other rounding goes to the nearest value, and a value exactly halfway rounds up.

`format_bytes(byte_count)` uses powers of 1,000 and the units `B`, `KB`, `MB`, `GB`, `TB`, `PB`: divide by 1,000 while the value is at least 1,000 and a larger unit exists, then round half up to one decimal place with `math.floor(value * 10 + 0.5) / 10` (1,250 bytes is `"1.3 KB"`) and print the number without a trailing `.0`. The unit is chosen before rounding, so a value that rounds up to 1,000 keeps its unit: 999,950 bytes is `"1000 KB"`. The number and the unit are separated by one space: `format_bytes(1_500)` is `"1.5 KB"`, `format_bytes(1_000)` is `"1 KB"`, `format_bytes(999)` is `"999 B"`, and values beyond 1,000 PB stay in `PB` (`"5000 PB"`).
