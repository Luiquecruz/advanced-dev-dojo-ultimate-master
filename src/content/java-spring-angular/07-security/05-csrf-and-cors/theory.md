# CSRF and CORS

Two browser-related protections are easy to confuse and easy to misconfigure. Cross-site request forgery (CSRF) is an attack that makes a logged-in user's browser send a state-changing request they never intended. Cross-origin resource sharing (CORS) is the mechanism that lets a server say which other origins may read its responses from browser code. This lesson explains what each protects, when CSRF protection is needed, and how to configure both in Spring Security 7 for an Angular client.

You need: The Spring Security Filter Chain (`SecurityFilterChain`, the lambda DSL), Sessions Versus Tokens (cookies, bearer tokens).

## What CSRF is

When a browser sends a request to a site, it attaches that site's cookies, even if the request was triggered by a different page. Suppose a learner is logged in to `courses.example.com`. A malicious page can contain a hidden form that posts to `https://courses.example.com/api/enrollments`. The browser adds the session cookie, the server sees a valid session, and the action runs. The attacker never sees the response; they only need the side effect.

The standard defense is the synchronizer token pattern: the server issues a random CSRF token, and every state-changing request must repeat it in a header or form field, a place the browser does not fill in automatically. A foreign page cannot read your token because of the same-origin policy. Setting `SameSite` on the session cookie adds protection, but Spring Security recommends it as defense in depth because older browsers may ignore it. All of this assumes that safe methods (`GET`, `HEAD`, `OPTIONS`, `TRACE`) never change state.

## When you need CSRF protection

The question is whether the browser attaches the credential on its own.

| Authentication | Credential sent by | CSRF protection needed |
| --- | --- | --- |
| Session cookie | The browser, automatically | Yes |
| Token in a cookie | The browser, automatically | Yes |
| Bearer token in the `Authorization` header, set by your script | Your code, explicitly | No |

A forged request from another site cannot add an `Authorization` header with your token, so a stateless bearer-token API has nothing for CSRF to abuse. That is why the project lesson turns it off for a bearer-only API. Spring Security enables CSRF protection by default for unsafe methods, and its guidance is to use it for any request that normal users can make from a browser, and to disable it only for services used by non-browser clients. Do not disable it just because a `POST` returned 403.

## Configuring CSRF for an Angular client

Angular's `HttpClient` implements the client half of the cookie-to-header scheme. It reads a cookie named `XSRF-TOKEN` and sends its value as the header `X-XSRF-TOKEN` on mutating requests (`POST`, `PUT`, `DELETE`) to relative or same-origin URLs, never on `GET` or `HEAD`. Spring Security 7 has a one-line setup for this style, `csrf.spa()`, which stores the token in a cookie that scripts can read and resolves the plain header value:

```java
@Bean
SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        .cors(Customizer.withDefaults())
        .csrf(csrf -> csrf.spa())
        .authorizeHttpRequests(authorize -> authorize
            .anyRequest().authenticated())
        .httpBasic(Customizer.withDefaults());
    return http.build();
}
```

Because Angular skips cross-origin URLs, a development server on one port calling an API on another will not send the header. Use the dev server's proxy so requests stay relative, or deploy both behind one origin.

## What CORS is

Browsers apply the same-origin policy: a page can send a request to another origin, but script on it cannot read the response unless that origin opts in with CORS headers. An Angular app served from `http://localhost:4200` calling an API on a different origin needs the API to answer with `Access-Control-Allow-Origin` naming that origin. For requests that could have side effects (a JSON body, a custom header, `PUT`, `DELETE`) the browser first sends a preflight `OPTIONS` request asking which method and headers are allowed, and only then sends the real one. Preflights carry no cookies or tokens, so CORS must be handled before authentication; otherwise the preflight looks unauthenticated and is rejected.

In Spring, publish a `UrlBasedCorsConfigurationSource` bean and call `.cors(Customizer.withDefaults())`, as above. Spring Security then places a CORS filter ahead of the security filters:

```java
@Bean
UrlBasedCorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();
    configuration.setAllowedOrigins(List.of("http://localhost:4200"));
    configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE"));
    configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-XSRF-TOKEN"));
    configuration.setAllowCredentials(true);
    configuration.setMaxAge(3600L);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/api/**", configuration);
    return source;
}
```

List origins explicitly. With `setAllowCredentials(true)`, the special value `*` is rejected with an `IllegalArgumentException`, because browsers do not accept it together with credentials.

## Common mistakes

- Disabling CSRF protection on a cookie-authenticated application because `POST` requests return 403. The fix is to send the token, not to remove the check.
- Believing CORS protects the API. It only controls what browser script may read; a simple cross-site form post is still sent, and non-browser clients ignore CORS entirely.
- Using `allowedOrigins("*")` together with credentials, which Spring Framework rejects with an `IllegalArgumentException`.
- Letting a `GET` endpoint change state, which breaks both the CSRF assumption and caching.

## In practice

The cleanest setup avoids CORS altogether: serve the Angular build and the API from one origin, or proxy the API during development. Where origins must differ, keep the allowed list short and per environment. Write tests for the negative cases, a `POST` without a token and a preflight from an unlisted origin, because those are the ones that silently regress.

## Check yourself

1. Why does a bearer-token API called with an explicit `Authorization` header not need CSRF protection?
2. Why must CORS be processed before Spring Security's authentication filters?
3. What does Angular `HttpClient` do with the `XSRF-TOKEN` cookie, and for which requests?
