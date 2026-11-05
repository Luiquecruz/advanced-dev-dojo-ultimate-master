import time

VALID = "2026-11-04T10:15:00Z ERROR [payments] Card declined for order ORD-104233"


@test("parse_log_line returns the named fields of a well-formed line")
def _():
    result = mod.parse_log_line(VALID)
    expected = {
        "timestamp": "2026-11-04T10:15:00Z",
        "level": "ERROR",
        "service": "payments",
        "message": "Card declined for order ORD-104233",
    }
    assert result == expected


@test("parse_log_line returns None unless the whole line has the format")
def _():
    rejected = [
        "",
        "proxy says: " + VALID,
        VALID + "\n",
        VALID.replace("ERROR", "error"),
        VALID.replace("ERROR", "NOTICE"),
        VALID.replace("[payments]", "payments"),
        "2026-11-04T10:15:00Z INFO [api] ",
    ]
    accepted = [line for line in rejected if mod.parse_log_line(line) is not None]
    assert accepted == []


@test("parse_log_line ends the service at the first closing bracket")
def _():
    result = mod.parse_log_line("2026-11-04T10:15:00Z WARNING [billing] retry [2/5] for card")
    service = (result or {}).get("service")
    message = (result or {}).get("message")
    assert service == "billing"
    assert message == "retry [2/5] for card"


@test("parse_log_line and mask_emails stay fast on long hostile text")
def _():
    # A linear pattern needs a few hundredths of a second here. The generous bound only catches
    # quadratic patterns (several seconds at this size); exponential ones never finish and are
    # stopped by the per-test time limit.
    noise = "a" * 50_000
    started = time.perf_counter()
    unstructured = mod.parse_log_line(noise + "!")
    unterminated = mod.parse_log_line("2026-11-04T10:15:00Z ERROR [api] " + noise + "\n")
    unclosed = mod.parse_log_line("2026-11-04T10:15:00Z ERROR [" + noise)
    masked = mod.mask_emails(noise)
    elapsed = time.perf_counter() - started
    assert unstructured is None
    assert unterminated is None
    assert unclosed is None
    assert masked == noise
    assert elapsed < 2.0


@test("mask_emails keeps the first character and the domain of every address")
def _():
    text = "Contact ada.lovelace@example.com or bob+billing@mail.example.org. Not emails: @home, x@y, me@localhost."
    masked = mod.mask_emails(text)
    assert masked == "Contact a***@example.com or b***@mail.example.org. Not emails: @home, x@y, me@localhost."


@test("extract_ids returns six-digit ASCII order ids in order and skips lookalikes")
def _():
    text = "Refund ORD-123456 and ORD-654321; ignore ORD-12345, ORD-1234567, XORD-111111 and ORD-١٢٣٤٥٦."
    ids = mod.extract_ids(text)
    assert ids == ["ORD-123456", "ORD-654321"]
