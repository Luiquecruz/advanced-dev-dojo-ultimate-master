# Dapper and Stored Procedures

After this lesson you can write queries with Dapper, map rows to C# records, pass lists and output parameters, call stored procedures, and run Dapper and EF Core on the same connection and transaction. You will also have a concrete rule for when hand-written SQL is the better tool, which many .NET job descriptions test by asking for "EF Core and Dapper".

You need: 07/01 (ADO.NET, parameters and `NpgsqlDataSource`), 07/02 (EF Core and `DbContext`), 07/03 (tables created by migrations), 02/03 (records) and 04/04 (cancellation tokens).

## Hand-written SQL, typed results

**Dapper** is a small library for the case where you want to write the SQL yourself but not the reading loop of 07/01: you write the query, bind parameters, and Dapper maps each row straight into a typed object by matching column names to property names. There is no change tracker, no model and no generated SQL.

It saves EF Core's translation and tracking work, but you give up generated SQL, migrations-aware mapping, the unit of work and compile-time checked queries. Most teams that list both use EF Core by default and Dapper for specific reads.

## Querying with Dapper

Dapper is a set of extension methods on any ADO.NET `DbConnection` (`Microsoft.Data.SqlClient`, `Npgsql`...).

```csharp
using Dapper;
using Npgsql;

public sealed record StockRow(string Sku, string Name, int Stock, decimal StockValue);

public sealed class StockReport(NpgsqlDataSource dataSource)
{
    public async Task<IReadOnlyList<StockRow>> TopByValueAsync(int limit, CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT "Sku", "Name", "Stock", "Stock" * "Price" AS "StockValue"
            FROM "Products"
            ORDER BY "StockValue" DESC
            LIMIT @limit
            """;

        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<StockRow>(
            new CommandDefinition(sql, new { limit }, cancellationToken: cancellationToken));
        return rows.AsList();
    }
}
```

The table was created by EF Core migrations, and on PostgreSQL EF Core creates quoted PascalCase identifiers (`"Products"`, `"Sku"`), so hand-written SQL must quote them too; unquoted `products` would not be found. The anonymous object `new { limit }` becomes the parameter `@limit`; nothing is concatenated into the SQL. `CommandDefinition` is how you pass a `CancellationToken`. Other methods follow the same shape: `QuerySingleOrDefaultAsync<T>` for one row, `ExecuteScalarAsync<T>` for one value, `ExecuteAsync` for `INSERT`/`UPDATE`/`DELETE` (it returns the affected row count). Results are buffered into a list by default, which the Dapper README calls "ideal in most cases".

Two features you will use often, shown here on SQL Server, where identifiers are case-insensitive:

```csharp
// ... list expansion: Dapper rewrites "IN @skus" into one parameter per value
var products = await connection.QueryAsync<StockRow>(
    "SELECT Sku, Name, Stock, Stock * Price AS StockValue FROM dbo.Products WHERE Sku IN @skus",
    new { skus = new[] { "MUG-01", "TEE-02" } });

// ... several result sets in one round trip
using var grid = await connection.QueryMultipleAsync(
    "SELECT COUNT(*) FROM dbo.Products; SELECT COUNT(*) FROM dbo.Categories;");
int productCount = await grid.ReadSingleAsync<int>();
int categoryCount = await grid.ReadSingleAsync<int>();
```

Multi-mapping (`QueryAsync<Order, Customer, Order>(sql, (order, customer) => ..., splitOn: "CustomerId")`) builds object graphs from joins when you need them.

## Stored procedures

Many SQL Server shops keep business rules in stored procedures, and the market asks for them. Dapper calls them with `CommandType.StoredProcedure`, and `DynamicParameters` handles output parameters:

```csharp
using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;

// ... connectionString, categoryId and cancellationToken come from the caller
await using var connection = new SqlConnection(connectionString);

var parameters = new DynamicParameters();
parameters.Add("@CategoryId", categoryId);
parameters.Add("@Total", dbType: DbType.Decimal, direction: ParameterDirection.Output, precision: 14, scale: 2);

await connection.ExecuteAsync(new CommandDefinition(
    "dbo.CalculateCategoryStockValue",
    parameters,
    commandType: CommandType.StoredProcedure,
    cancellationToken: cancellationToken));

decimal total = parameters.Get<decimal>("@Total");
```

Dapper opens a closed connection for the call and closes it again. EF Core can call a procedure that returns entity rows too, with `db.Products.FromSql($"EXECUTE dbo.GetDiscountedProducts {categoryId}")`, but SQL Server does not allow composing LINQ over a procedure call, so anything after it must run on the client.

## Raw SQL inside EF Core first

Before adding Dapper, check whether EF Core already covers the case. `FromSql` and `ExecuteSql` take an interpolated string and turn every `{value}` into a real parameter, and since EF Core 8 `Database.SqlQuery<T>` maps SQL results to an unmapped type:

```csharp
// ... SQL Server; db is the CatalogDbContext, threshold comes from the caller
var lowStock = await db.Database
    .SqlQuery<StockRow>($"SELECT Sku, Name, Stock, Stock * Price AS StockValue FROM dbo.Products WHERE Stock < {threshold}")
    .ToListAsync(cancellationToken);
```

`FromSqlRaw` and `SqlQueryRaw` do **not** parameterize what you concatenate; EF Core 10 adds an analyzer warning when it sees string concatenation in those calls.

## Mixing EF Core and Dapper safely

Both can share one connection and one transaction, so a Dapper read sees what EF Core wrote:

```csharp
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

// ... SQL Server; inside a handler with db (CatalogDbContext) and cancellationToken
await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);

db.Products.Add(new Product { Sku = "CAP-01", Name = "Cap", Price = 12m, CategoryId = 1 });
await db.SaveChangesAsync(cancellationToken);

var connection = db.Database.GetDbConnection();
int total = await connection.ExecuteScalarAsync<int>(
    "SELECT COUNT(*) FROM dbo.Products",
    transaction: transaction.GetDbTransaction());

await transaction.CommitAsync(cancellationToken);
```

`GetDbConnection` is an extension in the `Microsoft.EntityFrameworkCore` namespace (`RelationalDatabaseFacadeExtensions`), but `GetDbTransaction` lives in `Microsoft.EntityFrameworkCore.Storage` (`DbContextTransactionExtensions`); without that `using`, `transaction.GetDbTransaction()` does not compile. Do not dispose a connection you got from the context; the context owns it.

## Common mistakes

- **A column alias that does not match the type.** With a positional record such as `StockRow`, a misspelled alias makes Dapper throw at runtime because no constructor matches; with a settable-property class, the property silently keeps its default. Alias every computed column to the exact property name.
- **`ORDER BY` built from user input.** Pasting a query string value into the SQL opens it to injection, and parameters cannot replace column names. Map allowed values through a fixed list.
- **Forgetting the cancellation token.** Without `CommandDefinition` the query keeps running after the client disconnects. Pass the token every time.

## In practice

Pick Dapper or raw SQL when the query is a report with window functions, CTEs or vendor features EF Core does not translate, when a hot read path shows measured EF overhead, or when the logic already lives in stored procedures. Stay with EF Core for writes, aggregates that change together, and anything that benefits from migrations and the change tracker.

## Check yourself

1. Which three things do you give up when a query moves from EF Core LINQ to Dapper?
2. How does Dapper know which column goes into which property, and what happens when an alias is misspelled?
3. Why does `FromSql($"... {sku}")` stay safe while `FromSqlRaw("... '" + sku + "'")` does not?
