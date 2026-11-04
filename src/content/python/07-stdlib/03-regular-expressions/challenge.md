A support tool reads service logs, hides customer emails before tickets are shared, and links order numbers. Its input comes from users and other services, so every pattern must stay fast on hostile text. Write three functions in `main.py`.

## `parse_log_line(line)`

A log line has the shape `<timestamp> <LEVEL> [<service>] <message>`, with single spaces:

```text
2026-11-04T10:15:00Z ERROR [payments] Card declined for order ORD-104233
```

- `timestamp`: `YYYY-MM-DDTHH:MM:SSZ` with ASCII digits;
- `LEVEL`: one of `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`;
- `service`: one or more characters up to the **first** `]`;
- `message`: everything after the space that follows `]`, at least one character.

Return a dict with exactly the keys `"timestamp"`, `"level"`, `"service"` and `"message"` (use named groups). Return `None` when the text does not match from its first to its last character: extra text before the timestamp, an unknown or lowercase level, missing brackets, and any line break (including a trailing `"\n"`) all give `None`. A 20,000-character line with no structure must return `None` in well under a second.

## `mask_emails(text)`

Replace every email address with the first character of its local part, `***`, `@` and the unchanged domain: `ada.lovelace@example.com` becomes `a***@example.com`. A local part is 1 to 64 characters from `A-Z a-z 0-9 . _ % + -`; a domain is dot-separated labels of `A-Z a-z 0-9 -` ending in a label of at least two letters. Everything else in the text stays as it is. A 20,000-character text without any `@` must come back unchanged in well under a second.

## `extract_ids(text)`

Return a list of the order ids in `text`, in order of appearance. An order id is `ORD-` followed by exactly six ASCII digits `0-9`, as a whole word: `XORD-111111`, `ORD-12345` and `ORD-1234567` are not ids, and neither is `ORD-` followed by digits from other scripts such as `١٢٣٤٥٦`.
