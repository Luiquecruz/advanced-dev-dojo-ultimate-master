import math

SECONDS_PER_DAY = 86_400
UNITS = ["B", "KB", "MB", "GB", "TB", "PB"]


def round_half_up(value):
    return math.floor(value + 0.5)


def estimate_capacity(
    *,
    daily_active_users,
    requests_per_user_per_day,
    peak_factor,
    write_ratio,
    bytes_per_write,
    retention_days,
    replication_factor,
):
    requests_per_day = daily_active_users * requests_per_user_per_day
    writes_per_day = round_half_up(requests_per_day * write_ratio)
    return {
        "average_qps": math.ceil(requests_per_day / SECONDS_PER_DAY),
        "peak_qps": math.ceil(requests_per_day * peak_factor / SECONDS_PER_DAY),
        "write_qps": math.ceil(writes_per_day / SECONDS_PER_DAY),
        "storage_bytes": writes_per_day * bytes_per_write * retention_days * replication_factor,
    }


def format_bytes(byte_count):
    value = byte_count
    unit = 0
    while value >= 1000 and unit < len(UNITS) - 1:
        value /= 1000
        unit += 1
    rounded = round_half_up(value * 10) / 10
    number = int(rounded) if rounded.is_integer() else rounded
    return f"{number} {UNITS[unit]}"


if __name__ == "__main__":
    estimate = estimate_capacity(
        daily_active_users=10_000_000,
        requests_per_user_per_day=10,
        peak_factor=2,
        write_ratio=0.1,
        bytes_per_write=1_000,
        retention_days=1_825,
        replication_factor=3,
    )
    print(estimate)
    print(format_bytes(estimate["storage_bytes"]))
