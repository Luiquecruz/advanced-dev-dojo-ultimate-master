# Unit Testing with xUnit v3

After this lesson you can create an xUnit.net v3 test project, write facts and data-driven theories in the arrange-act-assert shape, share expensive setup with fixtures, and predict how `dotnet test` runs your tests, including which ones run in parallel.

You need: 00/07 (what a test is: arrange, act, assert), 01/02 (`dotnet new` and the CLI), 02/03 (classes and interfaces), 04/02 (`async Task`) and 04/04 (cancellation tokens).

## Creating the project

A test project is a separate project with a reference to the code under test; `dotnet test` builds both and runs every test it finds. xUnit v3 ships its own templates. The template Microsoft's xUnit tutorial uses (`dotnet new xunit`) still lists the v2 `xunit` package, and v2 is in maintenance mode.

```bash
dotnet new install xunit.v3.templates
dotnet new xunit3 -o Catalog.Tests
dotnet add Catalog.Tests reference Catalog
dotnet test
```

A v3 test project has `<OutputType>Exe</OutputType>`: each test project is a standalone executable, so `dotnet run` also runs the tests. v3 needs .NET 8 or later (or .NET Framework 4.7.2 or later).

## Facts and arrange-act-assert

A `[Fact]` is a test with no parameters. Name it after the method, the scenario and the expected result, and keep the three phases visible:

```csharp
using Xunit;

public sealed class PriceCalculatorTests
{
    [Fact]
    public void ApplyDiscount_PercentageAboveHundred_Throws()
    {
        // Arrange
        var calculator = new PriceCalculator();

        // Act
        Action act = () => calculator.ApplyDiscount(100m, percentage: 120);

        // Assert
        var error = Assert.Throws<ArgumentOutOfRangeException>(act);
        Assert.Equal("percentage", error.ParamName);
    }

    [Fact]
    public async Task LoadAsync_KnownSku_ReturnsProduct()
    {
        var repository = new InMemoryProductStore([new Product("SKU-1", 10m)]);

        var product = await repository.LoadAsync("SKU-1", TestContext.Current.CancellationToken);

        Assert.NotNull(product);
        Assert.Equal(10m, product.Price);
    }
}
// ... PriceCalculator, Product and InMemoryProductStore omitted
```

- `Assert.Equal(expected, actual)`: the expected value comes first, so the failure message reads correctly.
- `Assert.Throws<T>` requires that exact type; `Assert.ThrowsAny<T>` also accepts derived types. For async code use `await Assert.ThrowsAsync<T>(...)`.
- Async tests return `Task` or `ValueTask`. An `async void` test is failed at runtime in v3.
- `TestContext.Current.CancellationToken` is new in v3. It is cancelled when the run is aborted or a test times out, so pass it to every async call.

## Theories: one test, many rows

A `[Theory]` takes parameters and runs once per data row. Each row is reported as its own test, which replaces the `foreach` over cases that hides which case broke.

```csharp
public sealed class SkuParserTests
{
    [Theory]
    [InlineData("ABC-123", true)]
    [InlineData("abc-123", false)]
    [InlineData("", false)]
    public void IsValid_ReturnsExpected(string sku, bool expected)
    {
        Assert.Equal(expected, SkuParser.IsValid(sku));
    }

    public static TheoryData<decimal, int, decimal> Discounts => new()
    {
        { 100m, 10, 90m },
        { 100m, 0, 100m },
        { 19.99m, 50, 9.995m },
    };

    [Theory]
    [MemberData(nameof(Discounts))]
    public void ApplyDiscount_ReturnsDiscountedPrice(decimal price, int percentage, decimal expected)
    {
        Assert.Equal(expected, new PriceCalculator().ApplyDiscount(price, percentage));
    }
}
```

`[InlineData]` only takes compile-time constants, and `decimal` is not one, so decimal rows go through `[MemberData]`. `TheoryData<...>` gives those rows a type, so a wrong row is a compile error instead of a runtime cast failure.

## Lifecycle, fixtures and parallelism

xUnit creates **a new instance of the test class for every test**. The constructor is the per-test setup, and `IDisposable.Dispose()` (or `IAsyncLifetime`) is the per-test cleanup. Instance fields never leak from one test to the next; static fields do.

For setup that is too expensive to repeat, a fixture is created once and injected into the constructor:

```csharp
public sealed class CatalogFixture : IAsyncLifetime
{
    public Catalog Catalog { get; private set; } = null!;

    public async ValueTask InitializeAsync() => Catalog = await Catalog.LoadAsync("products.csv");

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;
}

public sealed class CatalogReportTests(CatalogFixture fixture) : IClassFixture<CatalogFixture>
{
    [Fact]
    public void TopFive_HasFiveItems() => Assert.Equal(5, fixture.Catalog.TopByStockValue(5).Count);
}
```

In v3, `IAsyncLifetime` methods return `ValueTask` and the interface inherits `IAsyncDisposable`.

| Scope | Mechanism |
| --- | --- |
| one test | constructor and `Dispose` |
| one class | `IClassFixture<T>` |
| several classes | `[CollectionDefinition]` + `ICollectionFixture<T>`, then `[Collection("name")]` on each class |
| the whole assembly | `[assembly: AssemblyFixture(typeof(T))]` (new in v3) |

Parallelism follows collections, and **xUnit runs test classes in parallel by default**: each class is its own collection. Tests inside a collection run one after another, and different collections run in parallel. Classes that must not overlap, for example two classes writing the same file, go in one collection, or in a collection declared with `DisableParallelization = true`.

## Common mistakes

- **Shared static state between test classes.** Classes run in parallel, so two classes changing the same static list fail at random, mostly in CI. Keep state in instance fields, or put those classes in one collection.
- **`async void` tests.** The runner cannot await them, and xUnit v3 fails them at runtime. Return `Task` or `ValueTask`.
- **`.Result` on a task inside a test.** It blocks a thread and wraps the real failure in an `AggregateException`. `await` the task.
- **`Assert.True(a == b)`.** A failure reports "expected True" instead of both values. Use `Assert.Equal(expected, actual)`.

## In practice

- Unit tests cover code you own with no infrastructure: parsers, pricing rules, validation, mapping. Keep them in a project separate from integration tests, so the unit project never references a database driver.
- One behavior per test, one act per test. If you need an `if` in a test, split it into two tests or a theory.
- Do not test private methods; test the public method that uses them.
- Choosing a framework: xUnit v3, NUnit and MSTest are all maintained and all work with `dotnet test`. Pick the one your team already uses. This track uses xUnit v3 because the ASP.NET Core and EF Core testing docs use xUnit in their samples.

## Check yourself

- Why does a static `List<Product>` shared by two test classes fail only sometimes?
- When would you use a class fixture instead of the constructor, and what does that trade away?
- Why is a theory with three `[InlineData]` rows better than one fact that loops over three cases?
