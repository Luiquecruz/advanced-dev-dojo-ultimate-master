# JWT and OAuth 2 Resource Servers

Most modern APIs do not log users in themselves. A separate authorization server, such as a company identity provider, authenticates people and hands the client a signed token. Your API then acts as a resource server: it only checks tokens and enforces permissions. This lesson explains the JWT format, the OAuth 2.0 roles and flows at overview level, and how to turn a Spring Boot 4 application into a resource server.

You need: The Spring Security Filter Chain (`SecurityFilterChain`, `hasAuthority`), Sessions Versus Tokens (bearer tokens, access and refresh tokens).

## What a JWT contains

A JSON Web Token (RFC 7519) is three Base64URL parts joined by dots: a header, a payload of claims, and a signature. The header names the signing algorithm and key id; the payload carries claims such as these (shown decoded, with fake values):

```json
{
  "iss": "https://idp.example.com/issuer",
  "sub": "learner-42",
  "aud": "course-api",
  "scope": "courses:read",
  "roles": ["LEARNER"],
  "iat": 1700000000,
  "exp": 1700003600
}
```

`iss` is who issued the token, `sub` the user, `aud` the intended recipient, and `exp` the expiry. Signed does not mean secret: anyone can decode the payload, so never put passwords or private data in it. The signature only proves that the issuer created the token and nobody changed it.

## Roles and flows in OAuth 2.0

OAuth 2.0 names four parties: the resource owner (the user), the client (the app acting for them), the authorization server (which issues tokens) and the resource server (your API). Which flow the client uses depends on what it is:

- **Authorization Code with PKCE** is the flow for apps that act for a signed-in user, including single-page applications. The browser is redirected to the authorization server, the user signs in there, and the app exchanges a one-time code plus a PKCE proof (RFC 7636) for tokens. PKCE is required for public clients, which cannot keep a secret.
- **Client Credentials** lets a back-end service obtain a token for itself.
- **Refresh Token** exchanges a refresh token for a new access token.

The implicit grant and the password grant are obsolete: the current security best practice (RFC 9700) says clients should not use the first and must not use the second. OpenID Connect (OIDC) adds an identity layer: the `openid` scope returns an ID token that tells the client who signed in. The client reads the ID token, and the API receives the access token; do not send an ID token to an API.

## Becoming a resource server in Spring Boot 4

Boot 4 renamed the starter to `spring-boot-starter-security-oauth2-resource-server`; the old `spring-boot-starter-oauth2-resource-server` name still exists but is deprecated. Point the application at the issuer in `application.yml`:

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: https://idp.example.com/issuer
          audiences: course-api
```

From the issuer's metadata endpoint Spring discovers the JWK Set URL (the issuer's public keys), and it downloads keys lazily on the first token, so startup does not depend on the identity provider. For every request with an `Authorization: Bearer` header it checks the signature against those keys, the `exp` and `nbf` timestamps, the `iss` claim, and, because of `audiences`, the `aud` claim. Only the algorithms of the issuer's keys are accepted, never whatever the token header asks for. If the identity provider does not publish metadata, set `jwk-set-uri` as well. Boot also stops creating its default in-memory user once the resource server module is on the classpath.

Then declare the rules and switch the JWT support on:

```java
@Bean
SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        .authorizeHttpRequests(authorize -> authorize
            .requestMatchers(HttpMethod.GET, "/api/courses/**").hasAuthority("SCOPE_courses:read")
            .anyRequest().denyAll())
        .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()));
    return http.build();
}
```

## From claims to authorities

By default each entry of the `scope` (or `scp`) claim becomes an authority with the prefix `SCOPE_`, which is why the rule above says `SCOPE_courses:read`. If the identity provider puts roles in another claim, convert them:

```java
@Bean
JwtAuthenticationConverter jwtAuthenticationConverter() {
    JwtGrantedAuthoritiesConverter authorities = new JwtGrantedAuthoritiesConverter();
    authorities.setAuthoritiesClaimName("roles");
    authorities.setAuthorityPrefix("ROLE_");
    JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
    converter.setJwtGrantedAuthoritiesConverter(authorities);
    return converter;
}
```

Pass it with `oauth2.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()))`. A converter that replaces the default also replaces scope mapping, so project lesson 08 builds one that returns both. A missing or invalid token produces `401` with a `WWW-Authenticate: Bearer` header; a valid token without the required authority produces `403`.

## Common mistakes

- Putting sensitive data in a JWT because it looks encoded. The payload is only Base64URL text that anyone can decode.
- Forgetting the `SCOPE_` prefix in `hasAuthority`, so a valid token is rejected with 403.
- Accepting tokens from an issuer without checking `iss` and `aud`, so a token meant for another API is accepted.
- Sending the ID token to the API instead of the access token.

## In practice

Teams rarely build the authorization server themselves; they use an identity provider and configure the issuer URI per environment. The API stays small: validate, map claims to authorities, and apply rules. Keep token lifetimes short and test with signed test tokens, as the project lesson does.

## Check yourself

1. Which parts of a token does a resource server check before it trusts the claims?
2. Which OAuth 2.0 flow should a single-page application use, and what does PKCE add?
3. A token carries `"scope": "courses:read"`. Which authority string does Spring Security create?
