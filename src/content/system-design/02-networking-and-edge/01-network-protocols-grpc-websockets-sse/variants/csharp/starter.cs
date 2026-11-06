using System.Text;

// Top-level statements: Run executes these lines and prints the results; the tests ignore them.
var stream = Sse.FormatEvent(new SseMessage("{\"cents\":1999}", Id: "1", Event: "price")) + ": heartbeat\n\n" + Sse.FormatEvent(new SseMessage("line one\nline two"));
Console.WriteLine(stream.Replace("\n", "\\n"));
foreach (var sseEvent in Sse.ParseEvents(stream))
{
    Console.WriteLine(sseEvent);
}

public record SseMessage(string Data, string? Id = null, string? Event = null, int? Retry = null);
public record SseEvent(string Event, string Data, string LastEventId);

public static class Sse
{
    public static string FormatEvent(SseMessage message)
    {
        var frame = new StringBuilder();
        if (message.Id is not null)
        {
            frame.Append($"id: {message.Id}\n");
        }
        if (message.Event is not null)
        {
            frame.Append($"event: {message.Event}\n");
        }
        if (message.Retry is not null)
        {
            frame.Append($"retry: {message.Retry}\n");
        }
        // TODO: reject line breaks in Id and Event
        // TODO: one `data:` line per line of Data
        frame.Append($"data: {message.Data}\n");
        return frame.Append('\n').ToString();
    }

    public static IReadOnlyList<SseEvent> ParseEvents(string stream)
    {
        var events = new List<SseEvent>();
        // TODO: read the stream line by line, keep the data buffer, event type and last event id, dispatch on empty lines
        return events;
    }
}
