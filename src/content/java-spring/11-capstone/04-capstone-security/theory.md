# Capstone: Security

This stage protects the API: users sign in with a username and password, receive a short-lived signed token, and Spring Security validates it on every request as an OAuth 2 resource server. Reading stays public, writing needs the `ADMIN` role, and the rules are proven by tests.

You need: Capstone: Requirements and Design, Capstone: The Spring API, Capstone: Persistence and Migrations.

## Goal

Add `POST /api/auth/login`, a stateless filter chain with role rules, and security tests. Module 06 (security) explains the filter chain, sessions versus tokens, JWT and resource servers, CSRF and CORS; this stage makes the choices concrete. As written in the design stage, the API signs its own tokens, which suits a local project and avoids running an identity provider; a real deployment would normally delegate that to one.

## Features

- Under the `local` profile only, two in-memory demo users, `ada` with role `ADMIN` and `reader` with role `READER`, with BCrypt-hashed passwords.
- A login endpoint that returns the token, its lifetime in seconds and the roles.
- Resource-server validation of the bearer token, with the `roles` claim mapped to authorities.
- Public `GET` of courses and the health endpoint; `POST` and `DELETE` of courses only for `ADMIN`; everything else denied.
- A signing secret that comes from the environment and is rejected when shorter than 32 bytes.

## Acceptance criteria

The fake local credentials are in the first code block of the steps below.

1. `POST /api/auth/login` with `ada` and her password answers `200` with an `accessToken` and the role `ROLE_ADMIN`; a wrong password answers `401` with the same message as an unknown user.
2. `GET /api/courses` with no token answers `200`.
3. `DELETE /api/courses/1` with no token answers `401`, with a `READER` token `403`, and with an `ADMIN` token `204`.
4. Tokens with a different signing secret, expired timestamps, a wrong issuer or a wrong audience each answer `401`.
5. Starting the application with a 10-byte secret fails immediately with a clear message.
6. No real password, secret or token appears in the repository or in the logs; clearly marked fake test credentials are allowed, and the secret comes from `APP_JWT_SECRET`.
7. Three security tests cover criterion 3 without a database.

## Suggested steps

1. Add `spring-boot-starter-security`, `spring-boot-starter-security-oauth2-resource-server` and, for tests, `spring-boot-starter-security-test`. Set `app.jwt.secret=${APP_JWT_SECRET}`.
2. Define a password encoder and an `AuthenticationManager` bean that requires an explicitly supplied `UserDetailsService`. Place the following demo user service in a configuration class restricted to the `local` profile; other deployments must provide their own authentication configuration and must not activate this demo profile:

```java
@Configuration
@Profile("local")
class LocalUsersConfiguration {
    @Bean
    UserDetailsService localUsers(PasswordEncoder encoder) {
        return new InMemoryUserDetailsManager(
                User.withUsername("ada").password(encoder.encode("local-admin-password")).roles("ADMIN").build(),
                User.withUsername("reader").password(encoder.encode("local-reader-password")).roles("READER").build());
    }
}
```

3. Build the key once and expose an encoder and a decoder that share it. Generate a cryptographically random secret; length alone does not guarantee entropy. The constructor rejects short secrets:

```java
byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
if (bytes.length < 32) {
    throw new IllegalStateException("app.jwt.secret must have at least 32 bytes");
}
SecretKey key = new SecretKeySpec(bytes, "HmacSHA256");
JwtEncoder encoder = new NimbusJwtEncoder(new ImmutableSecret<>(key));
NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
OAuth2TokenValidator<Jwt> audience = jwt -> jwt.getAudience().contains("course-catalog")
        ? OAuth2TokenValidatorResult.success()
        : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token"));
decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
        JwtValidators.createDefaultWithIssuer("https://catalog.example.com"), audience));
```

4. In a `TokenService`, build `JwtClaimsSet` with `issuer` matching `https://catalog.example.com`, audience `course-catalog`, `subject`, `issuedAt`, an `expiresAt` 15 minutes later and a `roles` claim, and encode it with a `JwsHeader` for `HS256`. The decoder validates timestamps, issuer and audience with the validators above.
5. Declare the `SecurityFilterChain` bean with the lambda DSL. The chain is stateless, and CSRF protection is off because the bearer token is attached by your code, not sent automatically by the browser; keep it on for any cookie-based session:

```java
http.csrf(AbstractHttpConfigurer::disable)
    .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
    .authorizeHttpRequests(r -> r
        .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
        .requestMatchers(HttpMethod.GET, "/api/courses", "/api/courses/*").permitAll()
        .requestMatchers("/actuator/health/**").permitAll()
        .requestMatchers("/api/courses/**").hasRole("ADMIN")
        .anyRequest().denyAll())
    .oauth2ResourceServer(o -> o.jwt(j -> j.jwtAuthenticationConverter(converter)));
```

6. Configure a `JwtGrantedAuthoritiesConverter` with the claim name `roles` and an empty prefix, because the claim already holds `ROLE_ADMIN`. Map `AuthenticationException` from the login in your advice to a `401` Problem Details with a generic message.
Security-filter failures happen before controller advice, so configure entry-point and denied handlers too. Keep the standard bearer handlers to set the challenge headers, then write a fixed Problem Details body with Boot's configured Jackson mapper. Set these handlers in both `exceptionHandling` and `oauth2ResourceServer` so missing tokens, invalid tokens and denied roles follow the contract:

```java
AuthenticationEntryPoint entryPoint = (request, response, exception) -> {
    new BearerTokenAuthenticationEntryPoint().commence(request, response, exception);
    writeSecurityProblem(response, mapper, 401, "Unauthorized");
};
AccessDeniedHandler denied = (request, response, exception) -> {
    new BearerTokenAccessDeniedHandler().handle(request, response, exception);
    writeSecurityProblem(response, mapper, 403, "Forbidden");
};
http.exceptionHandling(errors -> errors.authenticationEntryPoint(entryPoint).accessDeniedHandler(denied))
    .oauth2ResourceServer(o -> o.jwt(j -> j.jwtAuthenticationConverter(converter))
        .authenticationEntryPoint(entryPoint).accessDeniedHandler(denied));
```

The helper uses `tools.jackson.databind.ObjectMapper` in Boot 4; inject the configured mapper and keep every security response generic:

```java
private static void writeSecurityProblem(HttpServletResponse response, ObjectMapper mapper,
        int status, String title) throws IOException {
    response.setContentType("application/problem+json");
    mapper.writeValue(response.getOutputStream(), Map.of(
            "type", "about:blank", "title", title, "status", status,
            "detail", status == 401 ? "Authentication required" : "Access denied"));
}
```

Assert the status, content type and standard body members for missing tokens, rejected tokens and forbidden roles, and assert that bearer challenge headers remain present. The login advice still handles its own `AuthenticationException`.

7. Exercise this API directly with an HTTP client; no cross-origin browser frontend is part of the project. Do not treat CORS as authorization. A future browser consumer on another origin needs an explicit allowed-origin policy, and a future cookie-authenticated endpoint needs its own CSRF design.
8. Activate the `local` profile in tests that use the demo users. Confirm startup without that profile requires separately supplied authentication configuration. Write the tests with the `jwt()` request post-processor, which fabricates an authenticated principal, so no encoded token is needed for authorization-rule tests. These tests bypass signature and claim verification. Add separate bearer-header tests using locally signed tokens for criterion 4, as in Project: Secure Course API:

```java
@WebMvcTest(controllers = CourseController.class, properties = "app.jwt.secret=test-only-secret-with-at-least-32-bytes")
@Import({SecurityConfig.class, LocalUsersConfiguration.class})
@ActiveProfiles("local")
class CourseSecurityTest {
    @Autowired MockMvc mvc;
    @MockitoBean CourseService service;

    @Test
    void readersGetForbidden() throws Exception {
        mvc.perform(delete("/api/courses/1").with(jwt().authorities(new SimpleGrantedAuthority("ROLE_READER"))))
            .andExpect(status().isForbidden());
    }
}
```

## Stretch goals

- Add `@PreAuthorize("hasRole('ADMIN')")` on the service methods as a second line of defense behind the URL rules.
- Add a refresh flow with a longer-lived opaque token stored hashed in the database.
- Replace the in-memory users with a table and a `UserDetailsService` backed by it.

## Common mistakes

- Committing the signing secret or a default password "just for now". Anything in the repository must be assumed public.
- Returning different messages for an unknown user and a wrong password, which lets an attacker list valid usernames.
- Trusting a consumer’s permission flag as protection. The API must reject the HTTP call even when the caller bypasses every client-side check.
- Disabling CSRF protection without knowing why. It is safe here only because no cookie authenticates requests.

## In practice

Real systems usually separate the identity provider from the API and use asymmetric keys, so the API can verify tokens but never create them. The structure you built stays the same: a filter chain that turns a credential into an authenticated principal, role rules at the edge, and tests that pin each rule.

## Check yourself

1. Why does the API deny by default with `anyRequest().denyAll()` instead of permitting what is not listed?
2. What changes if the secret leaks, and why is a short token lifetime a mitigation?
3. Which rule would you test first, and which request proves it?
