@test("formatting an event writes id, event, retry and data lines in order and ends with an empty line")
async def _():
    full = mod.format_event({"id": "7", "event": "price", "retry": 5000, "data": '{"cents":1999}'})
    assert full == 'id: 7\nevent: price\nretry: 5000\ndata: {"cents":1999}\n\n'
    data_only = mod.format_event({"data": "hello"})
    assert data_only == "data: hello\n\n"
    empty = mod.format_event({"data": ""})
    assert empty == "data: \n\n"
    error = await capture_error(lambda: mod.format_event({"id": "1\n2", "data": "x"}))
    assert isinstance(error, ValueError), f"expected a ValueError, got {error!r}"
    assert str(error) == "id and event must not contain line breaks"
    error = await capture_error(lambda: mod.format_event({"event": "a\nb", "data": "x"}))
    assert isinstance(error, ValueError), f"expected a ValueError, got {error!r}"
    assert str(error) == "id and event must not contain line breaks"


# beginner mistake: writing multi-line data in a single data line, which ends the field at the first line break
@test("formatting an event writes one data line per line of data")
def _():
    frame = mod.format_event({"data": "line one\nline two\nline three"})
    assert frame == "data: line one\ndata: line two\ndata: line three\n\n"


@test("parsing a stream joins data lines with a line break, defaults the type to message and ignores comments")
def _():
    stream = ": connected\n\ndata: first\ndata:  indented\n\nevent: price\ndata:no space\n\n"
    events = mod.parse_events(stream)
    assert events == [
        {"event": "message", "data": "first\n indented", "last_event_id": ""},
        {"event": "price", "data": "no space", "last_event_id": ""},
    ]


@test("parsing a stream keeps the last event id, skips empty events (clearing their type), ignores unknown fields and drops an unfinished event")
def _():
    stream = "id: 41\ndata: a\n\nretry: 3000\nfoo: bar\n\ndata: b\n\nid: 43\ndata\n\nevent: lost\n\ndata: c\n\ndata: unfinished\n"
    events = mod.parse_events(stream)
    assert events == [
        {"event": "message", "data": "a", "last_event_id": "41"},
        {"event": "message", "data": "b", "last_event_id": "41"},
        {"event": "message", "data": "", "last_event_id": "43"},
        {"event": "message", "data": "c", "last_event_id": "43"},
    ]


@test("parsing reads back what formatting writes")
def _():
    messages = [
        {"id": "1", "event": "order", "data": '{"id":1}'},
        {"id": "2", "data": "multi\nline"},
        {"event": "ping", "retry": 1000, "data": ""},
    ]
    stream = "".join(mod.format_event(message) for message in messages)
    events = mod.parse_events(stream)
    assert events == [
        {"event": "order", "data": '{"id":1}', "last_event_id": "1"},
        {"event": "message", "data": "multi\nline", "last_event_id": "2"},
        {"event": "ping", "data": "", "last_event_id": "2"},
    ]
