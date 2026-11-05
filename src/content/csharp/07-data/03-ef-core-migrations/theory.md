# EF Core Migrations

After this lesson you can create a migration from a model change, read and fix the code EF Core generated, apply it locally, and choose how it reaches production: a migration bundle, a reviewed SQL script or a runtime call. You will also know the two failure modes that bite most teams: a rename that becomes a drop, and every replica migrating at startup.

You need: 07/01 (tables and SQL), 07/02 (the EF Core model and `DbContext`), 01/02 (`dotnet` CLI and global tools), 01/04 (NuGet packages) and 05/01 (environments).

## How migrations work

The C# model changes with every feature, and every database that runs the app (your laptop, CI, staging, production) must follow it, in the same order, without losing data. EF Core migrations do this in three parts:

1. **A migration is generated at development time.** When the model changes, `dotnet ef migrations add` compares it with a **model snapshot** committed in your repository and writes a C# class with the exact operations (`AddColumn`, `CreateIndex`...).
2. **The migration is source code.** You review it, edit it, commit it, and every environment replays the same steps.
3. **The database records what ran.** EF Core keeps a history table (`__EFMigrationsHistory`) with one row per applied migration and runs only the missing ones.

EF Core never inspects the live database to work out a diff, so the generated file is a proposal you must read, not a guarantee.

## Tools and the first migration

```bash
dotnet tool install --global dotnet-ef
dotnet add package Microsoft.EntityFrameworkCore.Design
dotnet ef migrations add InitialCreate
dotnet ef database update
```

The `dotnet-ef` tool builds and runs your startup project to create the `DbContext`, so the connection string and provider come from your normal configuration (it uses the `Development` environment when none is set). `migrations add` creates a `Migrations` folder with a timestamped migration, its designer file, and `CatalogDbContextModelSnapshot.cs`, the snapshot the next migration is compared against. `database update` applies pending migrations to the database in your configuration. Other commands you will use: `migrations list`, `migrations remove` (undo the last, not yet applied, migration), `migrations script` and `migrations bundle`.

## Reading a generated migration

Add `public string? Barcode { get; set; }` with `HasMaxLength(32)` to `Product` and run `dotnet ef migrations add AddProductBarcode`:

```csharp
using Microsoft.EntityFrameworkCore.Migrations;

public partial class AddProductBarcode : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "Barcode",
            table: "Products",
            type: "character varying(32)",
            maxLength: 32,
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "Barcode", table: "Products");
    }
}
```

`Up` moves the schema forward, `Down` reverts it (`database update <PreviousMigration>` runs the `Down` methods). Review three things every time: the column types and nullability, whether a `NOT NULL` column on a full table needs a default, and anything that drops data.

## The rename trap

Rename `Product.Name` to `Product.Title` and EF Core may not recognise the rename: depending on the change, the generated `Up` can be a `DropColumn` plus an `AddColumn`, which deletes every product name in production. Microsoft's guidance is to always inspect migrations because "a migration may drop a column when the intent was to rename it". When that happens, replace the two calls by hand:

```csharp
// ... inside Up(MigrationBuilder migrationBuilder)
migrationBuilder.RenameColumn(name: "Name", table: "Products", newName: "Title");
```

Data changes go in a migration too. After the `AddProductBarcode` migration above, a later migration can backfill the new column:

```csharp
// ... inside Up(MigrationBuilder migrationBuilder) of a migration after AddProductBarcode
migrationBuilder.Sql("UPDATE \"Products\" SET \"Barcode\" = \"Sku\" WHERE \"Barcode\" IS NULL;");
```

`migrationBuilder.Sql(...)` is the place for one-off data changes that must run exactly once, in order with the schema change. Reference data that the app always needs can also use EF Core's `UseSeeding`/`UseAsyncSeeding` options, which bundles, `dotnet ef database update` and `MigrateAsync()` run when they apply migrations (a SQL script does not).

## Getting migrations to production

Microsoft's applying-migrations page compares four strategies:

| Strategy | Use it when | Notes |
| --- | --- | --- |
| Migration bundle | Automated deployment | A single executable built in CI; no SDK or source code at run time; uses migration locking |
| SQL script | A DBA or a review gate must read or change the SQL | `dotnet ef migrations script --idempotent` only applies what is missing |
| `dotnet ef database update` | Local development and tests | Needs the SDK and the source; not for production |
| Runtime `MigrateAsync()` | Simple apps that accept startup migration | The app needs schema permissions |

```bash
# In CI: build the bundle once
ASPNETCORE_ENVIRONMENT=Production dotnet ef migrations bundle --output artifacts/efbundle

# At deploy time, as a one-shot job, with a deployment identity
./efbundle --connection "$DEPLOYMENT_CONNECTION_STRING"
```

Two rules from the same page: use a separate deployment identity that can change the schema while the application identity only reads and writes data, and in containers run the bundle as a one-shot job after the database is healthy, not from every replica's entrypoint. Since EF Core 9, `Migrate`, `database update` and bundles take a database-wide lock, and `Migrate` throws when the model has changes that no migration captures; `dotnet ef migrations has-pending-model-changes` detects that in CI. Never call `EnsureCreated()` on a database you will migrate: it creates the schema without the history table, and later migrations fail.

## Common mistakes

- **Applying a generated migration unread.** A rename becomes `DropColumn` plus `AddColumn`, and every value in that column is deleted in production. Read `Up` before committing and use `RenameColumn` for renames.
- **Migrating from every replica at startup.** Five containers start at once; the migration lock makes the others wait, so startup stalls, a failed migration crashes every replica, and the app needs schema permissions it should not have. Run a bundle once, as a deploy job.
- **`EnsureCreated()` on a database you will migrate.** It creates tables without the history table, so the next `database update` fails because the tables already exist. Use migrations from the first table on.

## In practice

- One pull request, one migration with a descriptive name. Commit the migration and the snapshot together; when two branches both add migrations, the snapshot conflicts, and the fix is to remove yours and add it again on top of the merged model.
- Never edit a migration that has run in a shared environment; add a new one.
- Plan destructive changes in steps: add the new column, deploy code that writes both, backfill, then drop the old column in a later release.
- For an existing database, `dotnet ef dbcontext scaffold` generates entities from it, the usual start when adopting EF Core on a legacy schema.

## Status as of 2026-11-05

- The migration commands above are from the EF Core 10 tools reference. EF Core 11 (release candidate, scheduled for November 2026) adds options such as `database update --add`; do not rely on them while targeting EF Core 10.

## Check yourself

1. What does EF Core compare against when you run `migrations add`, and what does it not look at?
2. Which deployment strategy would you pick when your DBA must approve every SQL statement, and which when a pipeline deploys without human review?
3. Why should the API container not run migrations from its entrypoint when it runs as five replicas?
