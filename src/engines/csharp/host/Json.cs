using System.Globalization;
using System.Text;

namespace Dojo.Host;

/// <summary>Minimal JSON writer for the reports and events, so the host needs no System.Text.Json assembly.</summary>
internal sealed class Json
{
    private readonly StringBuilder builder = new();
    private bool needsComma;

    public Json BeginObject() => Open('{');

    public Json EndObject() => Close('}');

    public Json BeginArray() => Open('[');

    public Json EndArray() => Close(']');

    public Json Name(string name)
    {
        Separate();
        WriteString(name);
        builder.Append(':');
        needsComma = false;
        return this;
    }

    public Json Value(string? value)
    {
        Separate();
        if (value is null)
        {
            builder.Append("null");
        }
        else
        {
            WriteString(value);
        }
        needsComma = true;
        return this;
    }

    public Json Value(bool value)
    {
        Separate();
        builder.Append(value ? "true" : "false");
        needsComma = true;
        return this;
    }

    public Json Value(long value)
    {
        Separate();
        builder.Append(value.ToString(CultureInfo.InvariantCulture));
        needsComma = true;
        return this;
    }

    public Json Property(string name, string? value) => Name(name).Value(value);

    public Json Property(string name, bool value) => Name(name).Value(value);

    public Json Property(string name, long value) => Name(name).Value(value);

    public override string ToString() => builder.ToString();

    private Json Open(char token)
    {
        Separate();
        builder.Append(token);
        needsComma = false;
        return this;
    }

    private Json Close(char token)
    {
        builder.Append(token);
        needsComma = true;
        return this;
    }

    private void Separate()
    {
        if (needsComma)
        {
            builder.Append(',');
        }
    }

    private void WriteString(string value)
    {
        builder.Append('"');
        foreach (var character in value)
        {
            switch (character)
            {
                case '"': builder.Append("\\\""); break;
                case '\\': builder.Append("\\\\"); break;
                case '\n': builder.Append("\\n"); break;
                case '\r': builder.Append("\\r"); break;
                case '\t': builder.Append("\\t"); break;
                default:
                    if (character < ' ')
                    {
                        builder.Append("\\u").Append(((int)character).ToString("x4", CultureInfo.InvariantCulture));
                    }
                    else
                    {
                        builder.Append(character);
                    }
                    break;
            }
        }
        builder.Append('"');
    }
}
