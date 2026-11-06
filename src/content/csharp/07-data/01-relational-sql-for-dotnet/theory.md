# Relational SQL for .NET

After this lesson you can open a connection to SQL Server or PostgreSQL from C#, run a parameterized query, read the rows, and pick the right driver package. You will also know why tutorials that still say `using System.Data.SqlClient;` are out of date, and why a .NET app opens and closes connections constantly without paying for it. Everything EF Core and Dapper do later in this module sits on top of what you see here.

You need: 04/02 (`async` and `await`), 04/03 (`await using`), 04/04 (cancellation tokens), 05/01 (one process serving many requests) and 05/03 (connection strings in configuration).

## Tables and SQL in five statements

A relational database stores data in **tables**: each row is one record, each column has a name and a type, and a **primary key** column (`Sku` below) identifies each row. Rows in different tables point at each other through **foreign keys** (an order line holds the `Sku` of its product). You talk to the database in SQL, and five statements cover most daily work:

```sql
CREATE TABLE Products (Sku varchar(64) PRIMARY KEY, Name varchar(200) NOT NULL, Price decimal(12,2) NOT NULL);
INSERT INTO Products (Sku, Name, Price) VALUES ('MUG-1', 'Mug', 9.90);
SELECT Sku, Name, Price FROM Products WHERE Price <= 20 ORDER BY Sku;
UPDATE Products SET Price = 11.50 WHERE Sku = 'MUG-1';
DELETE FROM Products WHERE Sku = 'MUG-1';
```

`SELECT` reads rows (`WHERE` filters, `ORDER BY` sorts; without it the order is not guaranteed), and `JOIN` combines rows of two tables on a key. An `UPDATE` or `DELETE` without `WHERE` changes every row. The .NET job market asks mostly for SQL Server and PostgreSQL, so this module uses both.

## ADO.NET: one model, several providers

ADO.NET is the data access model built into .NET. It defines abstract types in `System.Data.Common` (`DbConnection`, `DbCommand`, `DbParameter`, `DbDataReader`, `DbTransaction`) and each database ships a provider with the concrete classes:

- SQL Server: the `Microsoft.Data.SqlClient` package (`SqlConnection`, `SqlCommand`...).
- PostgreSQL: the `Npgsql` package (`NpgsqlDataSource`, `NpgsqlCommand`...).

`System.Data.SqlClient` is the old SQL Server provider. Its NuGet package is **deprecated** and says "Please use Microsoft.Data.SqlClient instead". The type names are the same, so old code compiles after changing the `using`, but the defaults differ (see below) and the two providers' objects are not interchangeable.

## A parameterized query with SqlClient

```csharp
using System.Data;
using Microsoft.Data.SqlClient;

// ... connectionString, maxPrice and cancellationToken come from the caller
await using var connection = new SqlConnection(connectionString);
await connection.OpenAsync(cancellationToken);

await using var command = new SqlCommand(
    "SELECT Sku, Name, Price FROM dbo.Products WHERE Price <= @maxPrice ORDER BY Sku",
    connection);
command.Parameters.Add(new SqlParameter("@maxPrice", SqlDbType.Decimal)
{
    Precision = 12,
    Scale = 2,
    Value = maxPrice
});

await using var reader = await command.ExecuteReaderAsync(cancellationToken);
while (await reader.ReadAsync(cancellationToken))
{
    string sku = reader.GetString(0);
    string name = reader.GetString(1);
    decimal price = reader.GetDecimal(2);
    Console.WriteLine($"{sku} {name} {price:0.00}");
}
```

Three methods cover almost everything: `ExecuteReaderAsync` for rows, `ExecuteScalarAsync` for one value (a `COUNT(*)`, a new id), and `ExecuteNonQueryAsync` for `INSERT`/`UPDATE`/`DELETE`, which returns the number of affected rows. `await using` disposes the reader, the command and the connection in reverse order, and disposing the connection returns it to the pool.

Microsoft's migration guide also advises against `AddWithValue` when you know the database type: the provider then infers the type from the .NET value, which can change query plans and conversions. Declaring `SqlDbType`, precision and scale is the safe default.

## Never build SQL with string interpolation

```csharp
// ... WRONG: the value becomes part of the SQL text
var sql = $"SELECT * FROM dbo.Products WHERE Sku = '{sku}'";
```

A SKU of `x' OR 1=1 --` turns this into a different statement. Parameters are sent separately from the SQL text, so the database never parses them as SQL. Column and table names cannot be parameters; if a user picks the sort column, map it through a fixed list (`"price" => "Price"`) instead of pasting the input.

## PostgreSQL with Npgsql

Since Npgsql 7.0 the recommended entry point is a **data source**: one thread-safe object, built once and reused, that maps to a connection pool.

```csharp
using Npgsql;

// ... connectionString and maxPrice come from configuration and the caller
await using var dataSource = NpgsqlDataSource.Create(connectionString);

await using var command = dataSource.CreateCommand(
    "SELECT sku, name, price FROM products WHERE price <= $1 ORDER BY sku");
command.Parameters.Add(new NpgsqlParameter { Value = maxPrice });

await using var reader = await command.ExecuteReaderAsync();
while (await reader.ReadAsync())
{
    Console.WriteLine($"{reader.GetString(0)} {reader.GetDecimal(2)}");
}
```

Npgsql accepts positional parameters (`$1`, `$2`) and named ones (`@p1`). In a web app you create the data source once and register it as a singleton, for example `builder.Services.AddSingleton(NpgsqlDataSource.Create(connectionString))`, then call `await dataSource.OpenConnectionAsync()` wherever you need a connection.

## Connection pooling

Opening a physical database connection is slow: a network round trip, authentication, encryption. The driver therefore keeps a **connection pool** inside your process. `OpenAsync` takes an idle connection from the pool when one exists, and disposing the connection returns it to the pool instead of closing it. Because the app is one long-running process serving many requests at once (05/01), the rule is: open a connection per unit of work, as late as possible, and dispose it as soon as you are done. Never keep one in a field or a singleton "to save time": a `SqlConnection` is not thread-safe, and the pool already makes opening cheap. Each distinct connection string gets its own pool, with a default maximum of 100 connections for SqlClient and Npgsql.

## Connection strings and encryption

`Microsoft.Data.SqlClient` 4.0 changed `Encrypt` to default to `true`, and the driver validates the server certificate. Against a SQL Server container with a self-signed certificate, the first connection fails with a certificate error. `TrustServerCertificate=True` makes it work, and Microsoft's guidance is to use it only in controlled development environments; in production, configure a certificate the client trusts. Connection strings themselves belong in configuration and secrets, never in source code.

## Common mistakes

- **A singleton `SqlConnection`.** Concurrent requests share one connection that is not thread-safe, and fail with "There is already an open DataReader" or corrupted results. Open and dispose a connection per unit of work.
- **Forgetting to dispose the connection.** Connections never return to the pool; under load the pool runs dry and requests time out waiting for one. Dispose every connection, command and reader.
- **SQL built with interpolation.** `$"... WHERE Sku = '{sku}'"` lets a crafted value rewrite the statement (SQL injection). Pass values as parameters.

## In practice

- New SQL Server code uses `Microsoft.Data.SqlClient`; new PostgreSQL code uses `Npgsql` with a data source. When you inherit `System.Data.SqlClient`, plan the migration and run `dotnet list package --include-transitive` to find who still pulls it in.
- Raw ADO.NET is rarely the whole data layer. Teams use EF Core for most work and Dapper for hand-written SQL; both run on these providers, so the pooling, parameter and encryption rules still apply.

## Status as of 2026-11-05

- `Microsoft.Data.SqlClient` 7.1.1 (2026-09-29, MIT). Version 7.0 moved Microsoft Entra authentication into the separate `Microsoft.Data.SqlClient.Extensions.Azure` package.
- `System.Data.SqlClient` 4.9.1 (2026-02-18) is marked deprecated on NuGet.

## Check yourself

1. Why is a singleton `SqlConnection` a bug in ASP.NET Core, and why does opening a new connection per unit of work not cost a network round trip each time?
2. Which `Execute*` method would you use for an `UPDATE`, and what does its return value tell you?
3. A colleague fixes a certificate error by adding `TrustServerCertificate=True` to the production connection string. What do you propose instead?
