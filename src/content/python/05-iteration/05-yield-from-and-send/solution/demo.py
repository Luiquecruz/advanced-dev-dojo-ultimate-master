from main import collect, flatten, running_average, tracked

batches = [[12, 15], (9, [30, (41,)]), "sensor-7", range(3)]
print("leaves:", list(flatten(batches)))

latency = running_average()
next(latency)
for sample in [120, 80, 100, 300]:
    print(f"latency {sample:>3} ms -> mean {latency.send(sample):.1f} ms")


def import_rows(rows):
    imported = 0
    for row in rows:
        if row:
            imported += 1
            yield row.upper()
    return {"imported": imported, "skipped": len(rows) - imported}


rows, summary = collect(import_rows(["ada", "", "alan", "grace"]))
print("rows:", rows, "| summary:", summary)

log = []
stream = tracked(["event-1", "event-2", "event-3"], log)
print("first event:", next(stream), "| log while paused:", log)
stream.close()
print("log after close():", log)
