# Project P3: Persist the Catalog

In this project you replace the in-memory store of the P2 catalog API with a real database. You will model the catalog with EF Core, evolve it with migrations, write one report with LINQ and one with Dapper, protect product updates with optimistic concurrency, reserve stock without lost updates and cache product reads. It takes about 10 hours and runs on your machine with the .NET 10 SDK and Docker.

## Coming from PHP/Magento

This is the work you would do in a Magento module with `db_schema.xml`, a resource model, a collection, a repository and a Redis cache tag. Expect the same pieces with different ownership: the schema comes from your C# model through reviewed migrations, the `DbContext` is the repository and unit of work for one request, and the cache lives partly in your own process. Resist two Magento reflexes: do not wrap EF Core in a generic repository before you need one, and do not protect stock with application code alone; let the database decide.

## Goal

Your P2 API keeps its endpoints and status codes with two deliberate changes: products gain an optional category, and `PUT /products/{sku}` returns `200` with the product and its new `version` instead of P2's `204`, because the client needs that version for its next edit. Its data survives restarts, concurrent edits are detected, stock never goes negative, reports run as efficient SQL, and repeated product reads skip the database.

## Features

- PostgreSQL (or SQL Server) in Docker, for example `docker run -d --name catalog-db -e POSTGRES_PASSWORD=dev -p 5432:5432 postgres:18` (PostgreSQL 18 is the current major as of 2026-11-05). The connection string lives in user secrets (`dotnet user-secrets set ConnectionStrings:Catalog "..."`), not in `appsettings.json`.
- `CatalogDbContext` with `Category` and `Product`: unique index on `Sku`, price precision, required names, a nullable `CategoryId`, and a concurrency token (`[Timestamp] uint Version` on PostgreSQL, `byte[]` rowversion on SQL Server).
- Seed data: three categories and P2's 25 products, spread across them, inserted by `UseSeeding`/`UseAsyncSeeding` when the tables are empty (EF Core runs both after `dotnet ef database update` and `MigrateAsync`). `POST` and `PUT` accept an optional `categoryId`; an unknown id returns 400.
- At least two migrations: `InitialCreate`, then one that adds a column, reviewed before applying.
- `GET /products` with paging and filtering as in P2, implemented as a no-tracking projection to DTOs.
- `PUT /products/{sku}` that takes the `version` the client saw, returns `200` with the new `version`, and returns 409 Problem Details on conflict.
- `POST /products/{sku}/reservations` with a quantity, implemented as a conditional `ExecuteUpdateAsync`; 409 when stock is insufficient.
- `GET /reports/stock-by-category`: count, total stock and stock value per category (products without one grouped as "Uncategorized"), as one LINQ query.
- `GET /reports/top-stock-value`: the five products with the highest stock value, written with Dapper on the same database.
- `GET /products/{sku}` cached with `HybridCache` (`Expiration` 5 minutes, `LocalCacheExpiration` 1 minute; with no Redis, the in-memory copy is the only one, so entries live 1 minute), invalidated by `POST /products`, `PUT` and reservations.
- EF Core command logging with `LogTo` in Development.

## Acceptance criteria

1. On an empty database, `dotnet ef database update` creates the schema, and `dotnet ef migrations list` shows every migration as applied.
2. `dotnet ef migrations has-pending-model-changes` reports that the model has no changes since the last migration.
3. Restarting the API keeps all products created through `POST /products`.
4. `GET /products/MUG-01` returns `200` with a `version`. Two `PUT /products/MUG-01` requests carrying that same `version`: the first returns `200` with a new version, the second returns `409` with a Problem Details body.
5. After a `PUT` sets the stock of `MUG-01` to 3, `POST /products/MUG-01/reservations` with quantity 2 returns `200`; a second one with quantity 2 returns `409`, and the stock in the database is 1, never negative.
6. `GET /reports/stock-by-category` returns one row per seeded category whose counts add up to the number of products. During that request the EF Core log shows exactly **one** SQL statement, and no `Include` or loop in your code loads products one by one.
7. `GET /reports/top-stock-value` returns the same values as a manual SQL query in your database client.
8. A second `GET /products/MUG-01` within the `LocalCacheExpiration` (one minute) produces no SQL statement in the log; after a `PUT` to that product, the next `GET` queries the database again and returns the new data. A `GET /products/NEW` that returns `404`, followed by `POST /products` creating `NEW`, makes the next `GET /products/NEW` return `200`.
9. The P2 criteria still pass, except that `PUT` now returns `200` instead of `204`: paging, 400 with field errors for an invalid body, 404 Problem Details for an unknown SKU, and `/openapi/v1.json` documents every endpoint.

## Suggested steps

1. Start the database container and add the provider package, `Microsoft.EntityFrameworkCore.Design` and the `dotnet-ef` tool (lesson 03).
2. Write the entities and `CatalogDbContext`, register it with `AddDbContext`, `LogTo` and the seeding delegates (lessons 02 and 04).
3. Run `dotnet ef migrations add InitialCreate`, read the generated file, then `dotnet ef database update`.
4. Replace the in-memory store in each endpoint; return DTOs from projections, never entities.
5. Add the second migration (for example a nullable `Barcode`) and check that it adds a column, not a drop and an add.
6. Add the `version` to the DTOs and the `PUT` handler with `OriginalValue` and the 409 mapping (lesson 06). Test with two `curl` calls carrying the same version.
7. Write the reservation endpoint as a conditional `ExecuteUpdateAsync` and check the affected row count.
8. Write the LINQ report with `GroupBy` and `Select`, count the statements in the log, then the Dapper report on a connection from `NpgsqlDataSource` or `db.Database.GetDbConnection()` (lesson 05).
9. Add `HybridCache`, cache `GET /products/{sku}`, and remove the key after every successful write to that SKU: create, update and reservation, since a cached miss would otherwise hide a new product (lesson 07).

## Stretch goals

- Generate a migration bundle with `dotnet ef migrations bundle` and apply it to a second, empty database with `--connection`.
- Add Redis in Docker and `AddStackExchangeRedisCache`, run two API instances on different ports, and observe how `LocalCacheExpiration` bounds staleness.
- Replace `Skip`/`Take` in `GET /products` with keyset pagination using an `after` cursor.
- Port the project to the other database (PostgreSQL to SQL Server or the reverse) and note every difference: identifier quoting, token type, provider package.

## Where to get help

- Lessons of this module: 07/01 (providers and connections), 07/02 (DbContext), 07/03 (migrations), 07/04 (projections and logging), 07/05 (Dapper), 07/06 (concurrency), 07/07 (caching). The P2 lesson (06/05) for the API contract.
- Microsoft docs: Migrations overview, Applying migrations, Efficient querying, Handling concurrency conflicts, HybridCache.

## Check yourself

1. Which acceptance criterion catches an N+1 query in the category report, and what would the log show if you had one?
2. Why must the `version` come from the client in criterion 4 instead of being read again in the `PUT` handler?
3. What would you change so that criterion 8 still holds when the API runs as two instances?
