from main import extract_ids, mask_emails, parse_log_line

lines = [
    "2026-11-04T10:15:00Z ERROR [payments] Card declined for order ORD-104233",
    "2026-11-04T10:16:02Z WARNING [billing] retry [2/5] for ada.lovelace@example.com",
    "proxy: 2026-11-04T10:17:00Z INFO [api] forwarded",
]

for line in lines:
    record = parse_log_line(line)
    if record is None:
        print("skipped:", line)
        continue
    print(record["level"], record["service"], "|", mask_emails(record["message"]), "| ids:", extract_ids(record["message"]))
