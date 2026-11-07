# Spring Modulith

Splitting an application into microservices solves some problems and creates many others. A modular monolith keeps one deployable application but organizes it into modules with strict boundaries, so the parts can evolve, be tested and one day be extracted independently. Spring Modulith is the Spring project that helps you define those modules and verify that the boundaries hold.

You need: Hexagonal Architecture, Inversion of Control and Dependency Injection.

## Modules are packages

By default every direct sub-package of the package that contains your `@SpringBootApplication` class is an application module. With the application class in `com.example.finance`:

```
com.example.finance
├── FinanceApplication.java
├── account            ← module
│   ├── AccountService.java       (public API)
│   └── internal
│       └── AccountRepository.java
├── transfer           ← module
└── audit              ← module
```

The rule is encapsulation. Types in the module's base package form its public API. Types in its sub-packages are internal and may not be used by other modules. Keep implementation classes package-private or in sub-packages so another module cannot reach them by accident, and expose only the small set of types others need. If a sub-package must be shared, expose it explicitly as a named interface with `@NamedInterface`.

## Verifying the structure

Add the Spring Modulith starter and write one test:

```java
class ModularityTests {

    @Test
    void verifiesModularStructure() {
        ApplicationModules.of(FinanceApplication.class).verify();
    }
}
```

`verify()` analyzes the compiled classes and fails the build when a module uses another module's internal type or when modules form a dependency cycle. This works through ArchUnit, the library that checks architectural rules in tests. You can also restrict which modules a module may use with `@ApplicationModule(allowedDependencies = "account")` on the module's `package-info.java`. The failure message names the offending class and the type it should not touch, which makes it easy to fix.

Because the check runs with the normal test suite, a boundary violation breaks the pull request instead of becoming an accepted habit.

## Testing a module in isolation

`@ApplicationModuleTest` boots only one module and its declared dependencies, instead of the whole application. This keeps integration tests fast and also proves that the module does not secretly depend on others. Other modules' beans can be replaced with mocks.

## Documenting the architecture

Spring Modulith can generate diagrams from the code with its `Documenter`. Since they come from the real structure, the documentation cannot drift from the system, which is the usual fate of hand-drawn diagrams.

## How it relates to hexagonal architecture

The two ideas complement each other. Modulith decides what is inside and outside a module and checks it. Hexagonal architecture decides how the inside of a module is arranged. A module can have its own domain, ports and adapters, with its public API being the inbound ports. Use both when the domain is rich; use only modules when the code is mostly simple.

## When not to use it

Do not create a module per entity. A module should represent a business capability with its own language, such as accounts, transfers or auditing. Many tiny modules that all depend on one another recreate the tangle you were avoiding. If you do not yet know where the boundaries are, start with fewer, larger modules and split when the code shows you the seam.

## Common mistakes

- Making every class public, so any module can use any other module's internals.
- Writing `verify()` once and ignoring the failure, or never running it in CI.
- Creating a module for each database table instead of each business capability.
- Letting two modules depend on each other directly, which creates a cycle that the verification reports and that makes extracting either module later very expensive.

## In practice

Add the verification test on day one, when there is nothing to fix. Name modules after capabilities, keep their public surface small, and treat a failing modularity test like a failing unit test.

## Check yourself

1. How does Spring Modulith decide which packages are modules?
2. What does `ApplicationModules.of(...).verify()` check?
3. Why is a module per database table a poor choice?
