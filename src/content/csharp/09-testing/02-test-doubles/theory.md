# Test Doubles: Fakes, Stubs and Mocks

After this lesson you can choose between a hand-written fake, a stub and a mock for a dependency, use the fakes Microsoft ships for time and logging, write NSubstitute or Moq setups without over-specifying, and decide on an assertion library knowing the Fluent Assertions licence change.

You need: 09/01 (xUnit facts and `TestContext`), 05/02 (constructor injection), 05/04 (`ILogger<T>`), 02/03 (interfaces) and 04/02 (async methods).

## Where a fake can plug in

A test can only replace a dependency that the code lets it replace. That place is a **seam**, usually a constructor parameter typed as an interface or an abstract class:

```csharp
public sealed class ReservationService(IStockGateway stock, TimeProvider clock)
{
    // ... calls stock.ReserveAsync(...) and clock.GetUtcNow(),
    // never new SqlStockGateway() or DateTime.UtcNow
}
```

Production passes the real gateway and `TimeProvider.System`; a test passes a fake of each. Code that creates its own dependencies with `new`, or reads a static member such as `DateTime.UtcNow`, has no seam, and nothing in the test can reach inside it.

The common mocking libraries, Moq and NSubstitute, generate a subclass at runtime, so they can only intercept interface members and `virtual` or `abstract` class members. C# methods are non-virtual by default and many teams seal their classes: a concrete `SqlProductRepository` cannot be mocked, `IProductRepository` can. .NET teams therefore lean on small hand-written fakes and on real objects when they are cheap, and keep a library for the few interactions that matter.

## The vocabulary

Microsoft's unit testing guide uses these words, and naming a double correctly tells the reader what the test checks:

- **Stub**: a controllable replacement that feeds data to the code under test. The test never asserts on it.
- **Mock**: a double the test asserts on, to check that an interaction happened.
- **Fake**: the generic term. In classic literature (Fowler, Meszaros) it is also a working lightweight implementation, such as an in-memory repository.

Most tests need stubs. Reach for a mock only when the interaction is the behavior: an email must be sent, a message must be published, a payment must not be captured twice.

## Hand-written fakes

For an interface with two or three methods, a fake class is often clearer than any library:

```csharp
public interface IStockGateway
{
    Task<int> GetAvailableAsync(string sku, CancellationToken ct);
    Task ReserveAsync(string sku, int quantity, CancellationToken ct);
}

public sealed class FakeStockGateway : IStockGateway
{
    private readonly Dictionary<string, int> _stock = new();
    public List<(string Sku, int Quantity)> Reservations { get; } = [];

    public FakeStockGateway With(string sku, int quantity) { _stock[sku] = quantity; return this; }

    public Task<int> GetAvailableAsync(string sku, CancellationToken ct) =>
        Task.FromResult(_stock.GetValueOrDefault(sku));

    public Task ReserveAsync(string sku, int quantity, CancellationToken ct)
    {
        Reservations.Add((sku, quantity));
        return Task.CompletedTask;
    }
}
```

The fake is reused across tests, survives refactors that do not change behavior, and its failure messages are ordinary assertions.

## Time and logging: use Microsoft's fakes

Code that calls `DateTime.UtcNow` cannot be tested at a chosen moment. Since .NET 8 the BCL has the abstract `TimeProvider` class: inject it, register `TimeProvider.System` in production, and pass a `FakeTimeProvider` (package `Microsoft.Extensions.TimeProvider.Testing`) in tests. For `ILogger<T>`, `FakeLogger<T>` (package `Microsoft.Extensions.Diagnostics.Testing`) records every log entry.

```csharp
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Testing;
using Microsoft.Extensions.Time.Testing;
using Xunit;

public sealed class ReservationServiceTests
{
    [Fact]
    public async Task Reserve_HoldExpired_ReleasesStockAndLogsWarning()
    {
        var clock = new FakeTimeProvider(new DateTimeOffset(2026, 11, 5, 9, 0, 0, TimeSpan.Zero));
        var logger = new FakeLogger<ReservationService>();
        var stock = new FakeStockGateway().With("SKU-1", 5);
        var service = new ReservationService(stock, clock, logger);
        var hold = await service.HoldAsync("SKU-1", 2, TestContext.Current.CancellationToken);

        clock.Advance(TimeSpan.FromMinutes(16));
        await service.ExpireHoldsAsync(TestContext.Current.CancellationToken);

        Assert.True(hold.IsReleased);
        Assert.Equal(LogLevel.Warning, logger.LatestRecord.Level);
    }
}
// ... ReservationService and hold type omitted
```

No library, no setup syntax, and the test controls the clock exactly.

## Mocking libraries

When a hand-written fake would be large, or you need to assert an interaction, use a library. NSubstitute and Moq are the two common ones, both BSD-3-Clause.

```csharp
using NSubstitute;

var payments = Substitute.For<IPaymentGateway>();
payments.CaptureAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
        .Returns(CaptureResult.Declined);

var handler = new PlaceOrderHandler(payments, new FakeStockGateway().With("SKU-1", 5));
var result = await handler.HandleAsync(order, TestContext.Current.CancellationToken);

Assert.False(result.IsSuccess);
await payments.Received(1).CaptureAsync(order.Id, Arg.Any<CancellationToken>());
// ... order, PlaceOrderHandler and CaptureResult omitted
```

The Moq equivalent is `new Mock<IPaymentGateway>()`, `.Setup(p => p.CaptureAsync(...)).ReturnsAsync(...)`, then `mock.Verify(..., Times.Once())`.

Use them with restraint:

- **Verify outcomes first, interactions second.** `Received(1)` on every call couples the test to the implementation, so a harmless refactor breaks it.
- **Do not mock what you do not own.** Mocking `HttpClient`, `DbContext` or `DbSet` produces tests that pass while production fails. Put your own interface in front, or use an integration test (lessons 09/03 and 09/04).
- **Do not mock value objects or DTOs.** Create them with `new`.
- **If a test needs five mocks, the class has too many dependencies.** That is design feedback, not a reason for a bigger mock setup.

## Assertion libraries and the licence change

xUnit's built-in `Assert` is enough for most tests. Fluent Assertions (`result.Should().Be(3)`) was the most popular add-on, but its licensing changed. Fluent Assertions 8.x is offered under a paid Xceed commercial licence, free for open-source and non-commercial use. The package's NuGet page states the terms of the version you reference, so read it before adding the package.

What that means for a team:

- A commercial product that adds Fluent Assertions 8.x needs a paid licence. Check with whoever approves dependencies, as for any paid component.
- Alternatives: the built-in `Assert`; Shouldly (BSD-3-Clause, `result.ShouldBe(3)`); or staying on an older Fluent Assertions major after checking its licence yourself.
- The choice is the team's. What matters is that it is a deliberate choice, recorded, and not an accident of `dotnet add package`.

## Common mistakes

- **Reading `DateTime.UtcNow` in the code under test.** The test cannot move that clock, so "expires after 15 minutes" needs a real 15-minute wait or stays untested. Inject `TimeProvider` and call `GetUtcNow()`.
- **Mocking a concrete class whose members are not virtual.** The setup throws or is silently ignored, so the test never controls the dependency. Put an interface in front of it.
- **Verifying every call.** `Received(1)` on each interaction fails on harmless refactors. Assert the outcome, and verify only interactions that are the behavior.
- **Mocking `DbSet` for queries.** The LINQ runs over a list, not as SQL, so translation errors never show. Test queries against a real database (lesson 09/04).

## In practice

- Default order: the real object if it is cheap and deterministic, then a hand-written fake, then a library stub, and a mock only for interactions that are the behavior.
- Inject `TimeProvider`, not `DateTime.UtcNow`; inject interfaces for anything that crosses a process boundary.
- Name doubles honestly: `stubPrices`, `mockMailer`, `FakeStockGateway`.
- Assert on log levels and structured values, not on message text that changes with each wording edit.

## Check yourself

- Why can Moq mock `IProductRepository` but not a sealed `SqlProductRepository`?
- When is `Received(1)` the right assertion, and when does it make the test brittle?
- What would you check before adding Fluent Assertions to a commercial project?
