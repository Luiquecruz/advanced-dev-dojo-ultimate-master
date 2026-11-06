CHAT_APP = {
    "daily_active_users": 1_000_000,
    "requests_per_user_per_day": 20,
    "peak_factor": 3,
    "write_ratio": 0.05,
    "bytes_per_write": 500,
    "retention_days": 365,
    "replication_factor": 3,
}

TEXT_SERVICE = {
    "daily_active_users": 10_000_000,
    "requests_per_user_per_day": 10,
    "peak_factor": 2,
    "write_ratio": 0.1,
    "bytes_per_write": 1_000,
    "retention_days": 1_825,
    "replication_factor": 3,
}


# beginner mistake: dividing by 3,600 or 1,440 instead of 86,400 seconds, or forgetting the requests per user
@test("the average QPS divides users × requests per user by 86,400 seconds and rounds up")
def _():
    chat_app = mod.estimate_capacity(**CHAT_APP)
    assert chat_app["average_qps"] == 232
    text_service = mod.estimate_capacity(**TEXT_SERVICE)
    assert text_service["average_qps"] == 1158


@test("the peak QPS applies the peak factor to the unrounded average")
def _():
    chat_app = mod.estimate_capacity(**CHAT_APP)
    assert chat_app["peak_qps"] == 695
    text_service = mod.estimate_capacity(**TEXT_SERVICE)
    assert text_service["peak_qps"] == 2315
    busier = mod.estimate_capacity(**{**TEXT_SERVICE, "daily_active_users": 50_000_000, "requests_per_user_per_day": 4, "peak_factor": 2.5})
    assert busier["peak_qps"] == 5788


@test("the write QPS and the storage count only writes, kept for the retention period on every replica")
def _():
    text_service = mod.estimate_capacity(**TEXT_SERVICE)
    assert text_service["write_qps"] == 116
    assert text_service["storage_bytes"] == 54_750_000_000_000
    chat_app = mod.estimate_capacity(**CHAT_APP)
    assert chat_app == {"average_qps": 232, "peak_qps": 695, "write_qps": 12, "storage_bytes": 547_500_000_000}
    single_copy = mod.estimate_capacity(**{**CHAT_APP, "replication_factor": 1})
    assert single_copy["storage_bytes"] == 182_500_000_000
    half_write = mod.estimate_capacity(**{**CHAT_APP, "daily_active_users": 1_001, "requests_per_user_per_day": 1, "write_ratio": 0.5})
    assert half_write["storage_bytes"] == 274_297_500


@test("the byte formatter uses powers of 1,000 with at most one decimal and stops at PB")
def _():
    sizes = (0, 999, 1_000, 1_250, 1_500, 999_950, 2_500_000, 3_000_000_000, 4_800_000_000_000, 5_000_000_000_000_000_000)
    formatted = [mod.format_bytes(size) for size in sizes]
    assert formatted == ["0 B", "999 B", "1 KB", "1.3 KB", "1.5 KB", "1000 KB", "2.5 MB", "3 GB", "4.8 TB", "5000 PB"]
