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
        if (message.Id?.Contains('\n') == true || message.Event?.Contains('\n') == true)
        {
            throw new ArgumentException("id and event must not contain line breaks");
        }
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
        foreach (var line in message.Data.Split('\n'))
        {
            frame.Append($"data: {line}\n");
        }
        return frame.Append('\n').ToString();
    }

    public static IReadOnlyList<SseEvent> ParseEvents(string stream)
    {
        var events = new List<SseEvent>();
        var data = new StringBuilder();
        var eventType = "";
        var lastEventId = "";

        foreach (var line in stream.Split('\n')[..^1])
        {
            if (line == "")
            {
                if (data.Length > 0)
                {
                    events.Add(new SseEvent(eventType == "" ? "message" : eventType, data.ToString(0, data.Length - 1), lastEventId));
                }
                data.Clear();
                eventType = "";
                continue;
            }
            if (line.StartsWith(':'))
            {
                continue;
            }
            var colon = line.IndexOf(':');
            var field = colon == -1 ? line : line[..colon];
            var value = colon == -1 ? "" : line[(colon + 1)..];
            if (value.StartsWith(' '))
            {
                value = value[1..];
            }
            switch (field)
            {
                case "data":
                    data.Append(value).Append('\n');
                    break;
                case "event":
                    eventType = value;
                    break;
                case "id":
                    lastEventId = value;
                    break;
            }
        }
        return events;
    }
}
