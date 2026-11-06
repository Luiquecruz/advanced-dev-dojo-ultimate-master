HEADER_FIELDS = ("id", "event", "retry")


def format_event(message):
    for name in ("id", "event"):
        value = message.get(name)
        if value is not None and "\n" in value:
            raise ValueError("id and event must not contain line breaks")
    lines = [f"{name}: {message[name]}" for name in HEADER_FIELDS if message.get(name) is not None]
    lines += [f"data: {line}" for line in message["data"].split("\n")]
    return "\n".join(lines) + "\n\n"


def parse_events(stream):
    events = []
    data = ""
    event_type = ""
    last_event_id = ""

    for line in stream.split("\n")[:-1]:
        if line == "":
            if data:
                events.append({"event": event_type or "message", "data": data[:-1], "last_event_id": last_event_id})
            data = ""
            event_type = ""
            continue
        if line.startswith(":"):
            continue
        field, _, value = line.partition(":")
        value = value.removeprefix(" ")
        if field == "data":
            data += value + "\n"
        elif field == "event":
            event_type = value
        elif field == "id":
            last_event_id = value
    return events


if __name__ == "__main__":
    stream = format_event({"id": "1", "event": "price", "data": '{"cents":1999}'}) + ": heartbeat\n\n" + format_event({"data": "line one\nline two"})
    print(repr(stream))
    print(parse_events(stream))
