using System.Buffers.Text;
using System.Text.Json;

public enum TokenCheck { Valid, Malformed, WrongIssuer, WrongAudience, Expired, NotYetValid }

public sealed record TokenClaims(string Issuer, IReadOnlyList<string> Audiences, string? Subject, DateTimeOffset Expires, DateTimeOffset? NotBefore);

public static class Jwt
{
    public static byte[] DecodeSegment(string segment) => Base64Url.DecodeFromChars(segment);

    public static TokenClaims ReadClaims(string token)
    {
        string[] parts = token.Split('.');
        if (parts.Length != 3)
        {
            throw new FormatException("A JWT has exactly three parts: header.payload.signature.");
        }

        using JsonDocument payload = JsonDocument.Parse(DecodeSegment(parts[1]));
        JsonElement claims = payload.RootElement;
        if (claims.ValueKind != JsonValueKind.Object)
        {
            throw new FormatException("The payload is not a JSON object.");
        }

        if (!claims.TryGetProperty("iss", out JsonElement iss) || iss.GetString() is not string issuer)
        {
            throw new FormatException("The token has no iss claim.");
        }
        if (!claims.TryGetProperty("exp", out JsonElement exp))
        {
            throw new FormatException("The token has no exp claim.");
        }

        var audiences = new List<string>();
        if (claims.TryGetProperty("aud", out JsonElement aud))
        {
            if (aud.ValueKind == JsonValueKind.Array)
            {
                foreach (JsonElement item in aud.EnumerateArray())
                {
                    audiences.Add(item.GetString()!);
                }
            }
            else
            {
                audiences.Add(aud.GetString()!);
            }
        }

        string? subject = claims.TryGetProperty("sub", out JsonElement sub) ? sub.GetString() : null;
        DateTimeOffset? notBefore = claims.TryGetProperty("nbf", out JsonElement nbf)
            ? NumericDate(nbf)
            : null;

        return new TokenClaims(issuer, audiences, subject, NumericDate(exp), notBefore);
    }

    private static DateTimeOffset NumericDate(JsonElement value)
    {
        long seconds = value.GetInt64();
        if (seconds < DateTimeOffset.MinValue.ToUnixTimeSeconds() || seconds > DateTimeOffset.MaxValue.ToUnixTimeSeconds())
        {
            throw new FormatException("A NumericDate is outside the range of DateTimeOffset.");
        }
        return DateTimeOffset.FromUnixTimeSeconds(seconds);
    }
}

public sealed class ClaimsValidator(string issuer, string audience, TimeSpan clockSkew, TimeProvider clock)
{
    public TokenCheck Check(string token)
    {
        TokenClaims claims;
        try
        {
            claims = Jwt.ReadClaims(token);
        }
        catch (Exception ex) when (ex is FormatException or JsonException)
        {
            return TokenCheck.Malformed;
        }

        if (claims.Issuer != issuer)
        {
            return TokenCheck.WrongIssuer;
        }
        if (!claims.Audiences.Contains(audience))
        {
            return TokenCheck.WrongAudience;
        }

        DateTimeOffset now = clock.GetUtcNow();
        if (now - clockSkew > claims.Expires)
        {
            return TokenCheck.Expired;
        }
        if (claims.NotBefore is DateTimeOffset notBefore && notBefore > now + clockSkew)
        {
            return TokenCheck.NotYetValid;
        }
        return TokenCheck.Valid;
    }
}
