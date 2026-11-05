using Dojo;
using System.Text;

public static class JwtTests
{
    private const string Issuer = "https://login.example.com/";
    private static readonly TimeSpan Skew = TimeSpan.FromMinutes(5);
    // 2026-01-01T00:00:00Z and one hour earlier, as NumericDate seconds.
    private const long Exp = 1767225600;
    private const long Nbf = 1767222000;

    private sealed class FixedClock(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }

    private static string Segment(string json) =>
        Convert.ToBase64String(Encoding.UTF8.GetBytes(json)).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static string Token(string payloadJson) =>
        Segment("""{"alg":"RS256","typ":"JWT"}""") + "." + Segment(payloadJson) + ".c2lnbmF0dXJl";

    private static string Payload(string iss = Issuer, string aud = "\"catalog-api\"") =>
        $$"""{"iss":"{{iss}}","sub":"42","aud":{{aud}},"nbf":{{Nbf}},"exp":{{Exp}}}""";

    private static ClaimsValidator At(DateTimeOffset now) => new(Issuer, "catalog-api", Skew, new FixedClock(now));

    // beginner mistake: decoding a segment with Convert.FromBase64String, which rejects '-', '_' and missing padding
    [Test("DecodeSegment reads Base64URL: '-' and '_' instead of '+' and '/', and no padding")]
    public static void DecodesBase64Url()
    {
        Assert.Equal("<<??>>", Encoding.UTF8.GetString(Jwt.DecodeSegment("PDw_Pz4-")));
        Assert.Equal("a", Encoding.UTF8.GetString(Jwt.DecodeSegment("YQ")));
    }

    [Test("ReadClaims returns issuer, subject, audiences, exp and nbf from the payload")]
    public static void ReadsClaims()
    {
        TokenClaims claims = Jwt.ReadClaims(Token(Payload(aud: """["catalog-api","orders-api"]""")));
        Assert.Equal(Issuer, claims.Issuer);
        Assert.Equal("42", claims.Subject);
        Assert.SequenceEqual(["catalog-api", "orders-api"], claims.Audiences);
        Assert.Equal(new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero), claims.Expires);
        Assert.Equal(new DateTimeOffset(2025, 12, 31, 23, 0, 0, TimeSpan.Zero), claims.NotBefore);
    }

    [Test("ReadClaims accepts aud as one string, leaves absent claims null, and rejects a token without three parts")]
    public static void ReadsShapes()
    {
        TokenClaims claims = Jwt.ReadClaims(Token($$"""{"iss":"{{Issuer}}","aud":"catalog-api","exp":{{Exp}}}"""));
        Assert.SequenceEqual(["catalog-api"], claims.Audiences);
        Assert.Null(claims.Subject);
        Assert.Null(claims.NotBefore);
        Assert.Throws<FormatException>(() => Jwt.ReadClaims("only.two"));
        Assert.Throws<FormatException>(() => Jwt.ReadClaims(Token($$"""{"aud":"catalog-api","exp":{{Exp}}}""")));
        Assert.Throws<FormatException>(() => Jwt.ReadClaims(Token($$"""{"iss":"{{Issuer}}","aud":"catalog-api"}""")));
    }

    [Test("Check returns Valid for a good token and names the first broken rule: format, issuer, audience, then the times")]
    public static void ChecksIssuerAndAudience()
    {
        ClaimsValidator validator = At(new DateTimeOffset(2025, 12, 31, 23, 30, 0, TimeSpan.Zero));
        Assert.Equal(TokenCheck.Valid, validator.Check(Token(Payload())));
        Assert.Equal(TokenCheck.Malformed, validator.Check("not-a-token"));
        Assert.Equal(TokenCheck.WrongIssuer, validator.Check(Token(Payload(iss: "https://login.example.com"))));
        Assert.Equal(TokenCheck.WrongAudience, validator.Check(Token(Payload(aud: "\"orders-api\""))));
        Assert.Equal(TokenCheck.WrongIssuer, validator.Check(Token(Payload(iss: "https://other.example.com/", aud: "\"orders-api\""))));

        DateTimeOffset expired = DateTimeOffset.FromUnixTimeSeconds(Exp).AddHours(1);
        Assert.Equal(TokenCheck.WrongIssuer, At(expired).Check(Token(Payload(iss: "https://login.example.com"))));
        DateTimeOffset early = DateTimeOffset.FromUnixTimeSeconds(Nbf).AddHours(-1);
        Assert.Equal(TokenCheck.WrongAudience, At(early).Check(Token(Payload(aud: "\"orders-api\""))));
    }

    [Test("Check accepts a token up to the clock skew after exp, and rejects it after that")]
    public static void ChecksExpiryWithSkew()
    {
        DateTimeOffset exp = DateTimeOffset.FromUnixTimeSeconds(Exp);
        Assert.Equal(TokenCheck.Valid, At(exp.AddMinutes(4).AddSeconds(59)).Check(Token(Payload())));
        Assert.Equal(TokenCheck.Expired, At(exp.AddMinutes(5).AddSeconds(1)).Check(Token(Payload())));
    }

    [Test("Check rejects a token whose nbf is more than the clock skew in the future")]
    public static void ChecksNotBeforeWithSkew()
    {
        DateTimeOffset nbf = DateTimeOffset.FromUnixTimeSeconds(Nbf);
        Assert.Equal(TokenCheck.NotYetValid, At(nbf.AddMinutes(-6)).Check(Token(Payload())));
        Assert.Equal(TokenCheck.Valid, At(nbf.AddMinutes(-4)).Check(Token(Payload())));
    }
}
