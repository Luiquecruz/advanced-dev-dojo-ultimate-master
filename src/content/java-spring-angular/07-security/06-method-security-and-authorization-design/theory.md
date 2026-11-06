# Method Security and Authorization Design

URL rules decide whether a request may reach a controller, but many decisions depend on data: whether the learner owns this enrollment, or whether the returned record belongs to the caller. Method security puts those rules next to the code they protect. This lesson covers `@EnableMethodSecurity`, `@PreAuthorize` and `@PostAuthorize`, the difference between roles, scopes and permissions, and the ownership check that prevents the most common access-control bug.

You need: The Spring Security Filter Chain (`hasRole`, `hasAuthority`), JWT and OAuth 2 Resource Servers (scope authorities, roles from claims).

## Turning it on

Spring Boot does not enable method security by default. Add `@EnableMethodSecurity` to a configuration class; it activates `@PreAuthorize`, `@PostAuthorize`, `@PreFilter` and `@PostFilter`. Under Spring Boot 4, tests that use `@WithMockUser` also need `spring-boot-starter-security-test`.

```java
@Configuration
@EnableMethodSecurity
class MethodSecurityConfig {
}
```

When a rule fails, the interceptor throws `AccessDeniedException`. During a web request the security filter chain turns it into `403`; outside a request you handle it yourself.

## Writing rules

`@PreAuthorize` runs before the method and takes a Spring Expression Language (SpEL) expression. `@PostAuthorize` runs after, so it can look at `returnObject`. Inside expressions, `authentication` is the current caller and method parameters are available as `#name`.

```java
@Service
class EnrollmentService {

    private final EnrollmentRepository repository;

    EnrollmentService(EnrollmentRepository repository) {
        this.repository = repository;
    }

    @PreAuthorize("hasRole('ADMIN')")
    List<Enrollment> findAll() {
        return repository.findAll();
    }

    @PostAuthorize("returnObject.owner() == authentication.name or hasRole('ADMIN')")
    Enrollment findById(long id) {
        return repository.findById(id).orElseThrow();
    }

    @PreAuthorize("hasAuthority('SCOPE_enrollments:write')")
    void delete(long id) {
        repository.deleteById(id);
    }

    @PreAuthorize("@enrollmentAccess.isOwner(#id, authentication)")
    void withdraw(long id) {
        repository.deleteById(id);
    }
}
```

`EnrollmentRepository` stands in for a repository like the ones in the persistence module, and `Enrollment` is a record with `id`, `owner` and `course`. The last rule calls a bean by name, which keeps a growing rule in testable Java instead of a long string. The bean and its method must be `public`, because SpEL reflection cannot call package-private members:

```java
@Component("enrollmentAccess")
public class EnrollmentAccess {

    private final EnrollmentRepository repository;

    EnrollmentAccess(EnrollmentRepository repository) {
        this.repository = repository;
    }

    public boolean isOwner(long id, Authentication authentication) {
        return repository.findById(id)
            .map(Enrollment::owner)
            .filter(owner -> owner.equals(authentication.getName()))
            .isPresent();
    }
}
```

Parameter names such as `#id` need compiler parameter metadata. The Spring Boot Maven parent enables it; elsewhere compile with `-parameters` or annotate a parameter with `@P("id")`. Use `@PostAuthorize` only for reads: the method has already run, so a state-changing method would have changed data before the check fails.

## Proxies and their limits

Method security is built on Spring proxies. A call from another bean passes through the proxy and is checked. A call from inside the same object, such as a new method added to `EnrollmentService`, does not:

```java
void deleteMany(List<Long> ids) {
    ids.forEach(this::delete); // runs on this object, so the proxy and the rule on delete are bypassed
}
```

Put protected methods on a bean that callers reach through injection, and cover the rule with a test that goes through the bean.

## Roles, scopes and permissions

| Concept | Answers | Example | Where it comes from |
| --- | --- | --- | --- |
| Role | Which job does the user have? | `ROLE_ADMIN` | Your user store or a token claim |
| Scope | What may this client do for the user? | `SCOPE_courses:read` | The token granted by the authorization server |
| Permission | Which exact action is allowed? | `course:delete` | Your application, usually granted by roles |

In Spring Security every one of these is a `GrantedAuthority` string; `hasRole('ADMIN')` just adds the `ROLE_` prefix. A scope limits a client application; a role describes the user. A request often needs both: the token must allow the action, and the user must be entitled to it. Prefer a few meaningful permissions granted to roles, for example with a `RoleHierarchy` bean (`ROLE_ADMIN > course:delete`), over long SpEL expressions repeated across methods. Spring's reference makes the same recommendation.

## Ownership checks

A role check alone is not enough. If any learner may call `GET /api/enrollments/{id}`, then changing the id returns someone else's record. That bug is broken object-level authorization, a form of the Broken Access Control risk in the OWASP Top 10. Compare the owner of the object with the caller, as `findById` and `isOwner` do, and return 403 or 404 on mismatch.

## Common mistakes

- Annotating only controllers and calling services from jobs or other beans, so a path exists with no rule. Put rules where the data is accessed.
- Using a role check for per-object data, so any learner can read another learner's record by guessing an id.
- Relying on `@PostAuthorize` for a method that changes data. The change has happened by the time the rule runs.
- Expecting a rule to apply on a self-invocation or a private method, which bypasses the proxy.

## In practice

Use both layers: URL rules for coarse, default-deny structure, and method rules for ownership and fine-grained permissions. Test each rule with an allowed caller, a caller with the wrong role, and an owner versus a non-owner.

## Check yourself

1. Why does `withdraw` use `@PreAuthorize` while `findById` can use `@PostAuthorize`?
2. What is the difference between a scope and a role?
3. Why does `deleteMany` not enforce the rule on `delete`?
