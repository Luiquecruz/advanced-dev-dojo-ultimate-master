# Authentication and Authorization Basics

Security is not a feature you add at the end; it is a property of every layer, and most breaches come from ordinary mistakes rather than clever attacks. This lesson gives you the vocabulary the rest of the module uses: who the attacker is, what authentication and authorization each answer, which HTTP status codes report them, and why you use vetted libraries instead of writing your own security code.

You need: Records, Enums and Sealed Types (sealed interfaces and records), Streams and Optional (`Optional`).

## The attacker's view

Treat everything that crosses a trust boundary as hostile input: request bodies, headers, cookies, query parameters, file uploads and even tokens. A browser, a script or a command-line tool can send any request to your server, so nothing the client does protects you. A hidden button, a disabled field or a client-side check improves the user experience, but an attacker never has to use your user interface.

Two questions organize most of the work. What are you protecting (accounts, orders, personal data)? And who could reach it (anonymous visitors, learners, administrators, other services)? Answering them tells you which endpoints need which protection.

## Authentication and authorization

**Authentication** answers "who is calling?". The caller proves an identity with a password, a one-time code or a token issued by a trusted party. **Authorization** answers "what may this caller do?". It runs after authentication and compares the identity, its roles or its granted permissions with the action requested.

HTTP reports the two failures differently. `401 Unauthorized` means the caller is not authenticated: the credentials are missing or invalid, despite the name. `403 Forbidden` means the caller is known but not allowed. The sealed type below models exactly that split:

```java
import java.util.Optional;
import java.util.Set;

public class AccessDemo {

    record Caller(String name, Set<String> roles) {
    }

    sealed interface Decision {
        record Allowed(Caller caller) implements Decision {
        }

        record Unauthenticated() implements Decision {
        }

        record Forbidden(Caller caller) implements Decision {
        }
    }

    static Decision decide(Optional<Caller> caller, String requiredRole) {
        if (caller.isEmpty()) {
            return new Decision.Unauthenticated();
        }
        if (!caller.get().roles().contains(requiredRole)) {
            return new Decision.Forbidden(caller.get());
        }
        return new Decision.Allowed(caller.get());
    }

    static int httpStatus(Decision decision) {
        return switch (decision) {
            case Decision.Allowed allowed -> 200;
            case Decision.Unauthenticated unauthenticated -> 401;
            case Decision.Forbidden forbidden -> 403;
        };
    }
}
```

An anonymous caller gets 401, a learner asking for an `ADMIN` operation gets 403, and an administrator gets 200. Spring Security produces the same outcomes from configuration, which the next lessons cover.

## The OWASP Top 10 as a checklist

The OWASP Top 10 is a consensus list of the most critical web application risks. It is useful as a review checklist. Broken Access Control, the first entry of the current list, covers a caller reaching data or actions that were never meant for them, for example by changing an id in a URL. The list also names authentication failures, cryptographic failures, security misconfiguration and injection. Each reappears in this module: access control in the lessons on method security, tokens and the filter chain; misconfiguration in the CSRF and CORS lesson.

## Never roll your own crypto

Cryptography is easy to get subtly wrong and hard to test. Use the platform and well-reviewed libraries, and follow standards:

- Store passwords only as salted, adaptive hashes such as bcrypt, never as plain text, never encrypted, and never with a fast hash such as SHA-256 alone.
- Sign and verify tokens with an established format (JWT, covered later) and a library, not a homemade scheme.
- Never hard-code real secrets. Keep them in the environment or a secret store, and use obviously fake values in examples:

```properties
spring.security.user.name=ada
spring.security.user.password=not-a-real-password
```

## Principles that carry through

Deny by default: a new endpoint should be closed until someone opens it on purpose. Grant least privilege: give each role only what it needs. Layer defenses, so one missed check is not the end: an endpoint rule, a method rule and a database filter all help. Log security events, but never log passwords, tokens or full card numbers.

## Common mistakes

- Treating a hidden button or a client-side route check as security. The server must enforce every rule, because requests do not have to come from your user interface.
- Returning 403 for a missing login or 401 for a missing permission, which confuses clients that react differently to each.
- Hashing passwords with a fast hash, or inventing a token format instead of using a standard one.
- Logging request headers or bodies in full, which writes passwords and tokens into log files.

## In practice

Real services keep authentication at the edge (a filter or gateway validates who is calling) and authorization close to the data (rules next to the methods that read and change it). Most incidents involve a check that was forgotten on one endpoint, which is why default-deny rules and tests for forbidden cases matter more than clever techniques.

## Check yourself

1. A request arrives with an expired token. Is the right answer 401 or 403, and why?
2. A learner calls `DELETE /api/courses/7`, which only administrators may do. Which status does the server return?
3. Why is disabling the delete button for learners not enough?
