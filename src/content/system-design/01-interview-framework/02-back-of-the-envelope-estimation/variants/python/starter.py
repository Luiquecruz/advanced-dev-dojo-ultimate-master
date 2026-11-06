import math

SECONDS_PER_DAY = 86_400


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
    # TODO: requests per day = daily active users × requests per user per day
    requests_per_day = 0
    # TODO: writes per day = requests per day × write ratio, rounded half up: math.floor(x + 0.5)
    writes_per_day = 0
    return {
        # TODO: math.ceil(requests per day / SECONDS_PER_DAY)
        "average_qps": requests_per_day,
        # TODO: math.ceil(requests per day × peak factor / SECONDS_PER_DAY), from the unrounded average
        "peak_qps": requests_per_day * peak_factor,
        # TODO: math.ceil(writes per day / SECONDS_PER_DAY)
        "write_qps": writes_per_day,
        # TODO: writes per day × bytes per write × retention days × replication factor
        "storage_bytes": writes_per_day * bytes_per_write,
    }


def format_bytes(byte_count):
    # TODO: divide by 1,000 while the value is at least 1,000 (B, KB, MB, GB, TB, PB) and round half up to one decimal
    return f"{byte_count} B"


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
