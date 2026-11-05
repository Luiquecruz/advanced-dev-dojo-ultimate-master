using System.Buffers.Text;
using System.Text.Json;

public enum TokenCheck { Valid, Malformed, WrongIssuer, WrongAudience, Expired, NotYetValid }

public sealed record TokenClaims(string Issuer, IReadOnlyList<string> Audiences, string? Subject, DateTimeOffset Expires, DateTimeOffset? NotBefore);

public static class Jwt
{
    public static byte[] DecodeSegment(string segment)
    {
        // TODO: a JWT segment is Base64URL ('-' and '_', no '=' padding), not standard Base64.
        return Convert.FromBase64String(segment);
    }

    public static TokenClaims ReadClaims(string token)
    {
        string[] parts = token.Split('.');
        using JsonDocument payload = JsonDocument.Parse(DecodeSegment(parts[1]));
        JsonElement claims = payload.RootElement;

        // TODO: require exactly three parts, read "aud" as a string or an array, read "sub" and "nbf" when present,
        // and throw FormatException when "iss" or "exp" is missing.
        return new TokenClaims(
            claims.GetProperty("iss").GetString()!,
            [claims.GetProperty("aud").GetString()!],
            null,
            DateTimeOffset.FromUnixTimeSeconds(claims.GetProperty("exp").GetInt64()),
            null);
    }
}

public sealed class ClaimsValidator(string issuer, string audience, TimeSpan clockSkew, TimeProvider clock)
{
    public TokenCheck Check(string token)
    {
        // TODO: Malformed when ReadClaims fails, then the issuer, the audience, exp and nbf,
        // compared with clock.GetUtcNow() and the clock skew.
        return TokenCheck.Valid;
    }
}
