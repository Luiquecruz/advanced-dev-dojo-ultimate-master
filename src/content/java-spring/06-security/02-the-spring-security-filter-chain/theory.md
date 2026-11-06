# The Spring Security Filter Chain

Spring Security protects a web application with a chain of servlet filters that every request passes through before it reaches a controller. This lesson explains what you get by adding one dependency, how the filter chain is structured, how to declare your own rules with a `SecurityFilterChain` bean, and how users and passwords are stored. Everything here applies to Spring Boot 4, which uses Spring Security 7.

You need: Interfaces and Generics (interfaces and lambdas), Streams and Optional (`Optional`).

## What the starter does by default

Add `spring-boot-starter-security` and every endpoint, including `/error`, requires authentication. Boot creates one in-memory user named `user` with a random password that it prints at WARN level on startup (`Using generated security password: ...`), and answers unauthenticated requests with a login form or HTTP Basic, depending on the `Accept` header. CSRF protection and the usual security headers are on. The generated password is for development only; a real application replaces it. You can set a fixed pair with `spring.security.user.name` and `spring.security.user.password` for local experiments.

## The filter chain

Spring Security registers one filter, `FilterChainProxy`, which delegates to one or more `SecurityFilterChain` beans. For each request the first chain whose matcher fits runs, and only that chain. A chain is an ordered list of security filters: among the configured filters, `CsrfFilter` runs before common authentication filters (`BasicAuthenticationFilter`, `UsernamePasswordAuthenticationFilter`), with `AuthorizationFilter` later in the chain, which applies your access rules. Order matters because authorization needs an identity, so authentication runs before it. If you need to see which filters run, set the log level of `org.springframework.security.web.DefaultSecurityFilterChain` to DEBUG.

## Declaring your own chain

Declaring a `SecurityFilterChain` bean replaces Boot's default web security. You configure `HttpSecurity` with the lambda DSL, which is the only style Spring Security 7 supports (the older `.and()` chaining was removed). Rules in `authorizeHttpRequests` are checked in order and the first match wins, so list specific rules before general ones and finish with a catch-all.

```java
@Configuration
@EnableWebSecurity
class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(authorize -> authorize
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated())
            .httpBasic(Customizer.withDefaults());
        return http.build();
    }
}
```

`hasRole("ADMIN")` checks for the authority `ROLE_ADMIN`; `hasAuthority` compares the exact string. Ending with `.anyRequest().denyAll()` instead of `authenticated()` gives deny by default, which is stricter when an application has few public routes.

## Users and passwords

Authentication needs a source of users. Spring Security reads them through `UserDetailsService`, which returns a `UserDetails` (name, password hash, authorities) for a username. `InMemoryUserDetailsManager` is a ready-made implementation for demos and tests. Passwords are compared through a `PasswordEncoder`; the recommended one is the delegating encoder, which writes the algorithm into the stored value as a prefix, such as `{bcrypt}$2a$10$...`, so you can change algorithms later without invalidating old hashes. Hashing is slow on purpose, so it is the application's job to hash on registration and let the encoder verify on login.

```java
@Bean
PasswordEncoder passwordEncoder() {
    return PasswordEncoderFactories.createDelegatingPasswordEncoder();
}

@Bean
UserDetailsService userDetailsService(PasswordEncoder passwordEncoder) {
    UserDetails learner = User.builder()
        .username("ada")
        .password(passwordEncoder.encode("not-a-real-password"))
        .roles("LEARNER")
        .build();
    return new InMemoryUserDetailsManager(learner);
}
```

A real application loads users from a database by implementing the interface. It throws `UsernameNotFoundException` for an unknown name and never reveals whether the name or the password was wrong:

```java
@Service
class LearnerUserDetailsService implements UserDetailsService {

    private final LearnerRepository learners;

    LearnerUserDetailsService(LearnerRepository learners) {
        this.learners = learners;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return learners.findByEmail(username)
            .map(learner -> User.builder()
                .username(learner.email())
                .password(learner.passwordHash())
                .roles(learner.roles().toArray(String[]::new))
                .build())
            .orElseThrow(() -> new UsernameNotFoundException("Unknown learner"));
    }
}
```

## Common mistakes

- Leaving the generated password and default chain in place, or committing a real password to `application.yml`. Defaults are for development; production needs real users and secrets from the environment.
- Putting `anyRequest()` before specific rules. Spring Security rejects later request matchers during configuration, so the application fails to start. Put the catch-all last.
- Storing `{noop}` passwords or using `User.withDefaultPasswordEncoder()` outside a demo, which keeps passwords recoverable.
- Disabling CSRF protection just because a POST returned 403, without understanding which clients use the endpoint.

## In practice

Most applications keep one chain for the API, a `PasswordEncoder` bean, and a `UserDetailsService` backed by a database table or, increasingly, no user store at all because an identity provider issues tokens (the OAuth 2 lessons later in this module). Tests exercise each rule with and without credentials, so a forgotten rule fails a test instead of reaching production.

## Check yourself

1. Why does the order of `requestMatchers` rules matter?
2. What does the `{bcrypt}` prefix in a stored password let the delegating encoder do?
3. Which bean do you declare to replace Boot's default web security, and which bean do you add to load users from a database?
