using Dojo;

public static class ServerSentEventsTests
{
    [Test("formatting an event writes id, event, retry and data lines in order and ends with an empty line")]
    public static void FormatsFieldsInOrder()
    {
        Assert.Equal("id: 7\nevent: price\nretry: 5000\ndata: {\"cents\":1999}\n\n", Sse.FormatEvent(new SseMessage("{\"cents\":1999}", Id: "7", Event: "price", Retry: 5000)));
        Assert.Equal("data: hello\n\n", Sse.FormatEvent(new SseMessage("hello")));
        Assert.Equal("data: \n\n", Sse.FormatEvent(new SseMessage("")));
        var idError = Assert.Throws<ArgumentException>(() => Sse.FormatEvent(new SseMessage("x", Id: "1\n2")));
        Assert.Equal("id and event must not contain line breaks", idError.Message);
        var eventError = Assert.Throws<ArgumentException>(() => Sse.FormatEvent(new SseMessage("x", Event: "a\nb")));
        Assert.Equal("id and event must not contain line breaks", eventError.Message);
    }

    // beginner mistake: writing multi-line data in a single data line, which ends the field at the first line break
    [Test("formatting an event writes one data line per line of data")]
    public static void WritesOneDataLinePerLine()
    {
        Assert.Equal("data: line one\ndata: line two\ndata: line three\n\n", Sse.FormatEvent(new SseMessage("line one\nline two\nline three")));
    }

    [Test("parsing a stream joins data lines with a line break, defaults the type to message and ignores comments")]
    public static void ParsesDataTypeAndComments()
    {
        var stream = ": connected\n\ndata: first\ndata:  indented\n\nevent: price\ndata:no space\n\n";
        Assert.SequenceEqual(
        [
            new SseEvent("message", "first\n indented", ""),
            new SseEvent("price", "no space", ""),
        ], Sse.ParseEvents(stream));
    }

    [Test("parsing a stream keeps the last event id, skips empty events (clearing their type), ignores unknown fields and drops an unfinished event")]
    public static void KeepsLastEventIdAndDropsUnfinishedEvent()
    {
        var stream = "id: 41\ndata: a\n\nretry: 3000\nfoo: bar\n\ndata: b\n\nid: 43\ndata\n\nevent: lost\n\ndata: c\n\ndata: unfinished\n";
        Assert.SequenceEqual(
        [
            new SseEvent("message", "a", "41"),
            new SseEvent("message", "b", "41"),
            new SseEvent("message", "", "43"),
            new SseEvent("message", "c", "43"),
        ], Sse.ParseEvents(stream));
    }

    [Test("parsing reads back what formatting writes")]
    public static void ReadsBackWhatFormattingWrites()
    {
        SseMessage[] messages =
        [
            new("{\"id\":1}", Id: "1", Event: "order"),
            new("multi\nline", Id: "2"),
            new("", Event: "ping", Retry: 1000),
        ];
        var stream = string.Concat(messages.Select(Sse.FormatEvent));
        Assert.SequenceEqual(
        [
            new SseEvent("order", "{\"id\":1}", "1"),
            new SseEvent("message", "multi\nline", "2"),
            new SseEvent("ping", "", "2"),
        ], Sse.ParseEvents(stream));
    }
}
