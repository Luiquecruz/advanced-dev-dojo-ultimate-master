def format_event(message):
    frame = ""
    if message.get("id") is not None:
        frame += f"id: {message['id']}\n"
    if message.get("event") is not None:
        frame += f"event: {message['event']}\n"
    if message.get("retry") is not None:
        frame += f"retry: {message['retry']}\n"
    # TODO: reject line breaks in id and event
    # TODO: one `data:` line per line of data
    frame += f"data: {message['data']}\n"
    return frame + "\n"


def parse_events(stream):
    events = []
    # TODO: read the stream line by line, keep the data buffer, event type and last event id, dispatch on empty lines
    return events


if __name__ == "__main__":
    stream = format_event({"id": "1", "event": "price", "data": '{"cents":1999}'}) + ": heartbeat\n\n" + format_event({"data": "line one\nline two"})
    print(repr(stream))
    print(parse_events(stream))
