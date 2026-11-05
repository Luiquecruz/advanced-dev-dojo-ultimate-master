# Configuration and the Options Pattern

After this lesson you can predict which value wins when the same key is set in `appsettings.json`, an environment variable and the command line, bind a configuration section to a typed class, and make the app refuse to start when a required setting is missing or invalid.

## Coming from PHP/Magento

Magento splits settings in three places: `app/etc/env.php` (per deployment: database, cache, crypt key), `app/etc/config.php` (module list and shared settings, committed) and the `core_config_data` table (admin settings, with default, website and store scopes). Values are read as strings by path, such as `$scopeConfig->getValue('carriers/flatrate/price')`.

In ASP.NET Core, configuration is a set of providers stacked on top of each other, flattened into keys like `Shipping:FlatRate:Price`. The closest thing to `env.php` is environment variables plus `appsettings.{Environment}.json`; the closest thing to `config.php` is `appsettings.json` in the repository. There is no built-in equivalent of `core_config_data` scopes: per-store, admin-editable settings are application data and belong in your database.

The trap: in Magento, reading a path gives you the current value. In .NET, the most common way to inject settings, `IOptions<T>`, reads them once and never sees a change. Another trap: an environment variable silently overrides the JSON file, which is a feature in containers and a surprise when you debug locally.

## Providers and precedence

`WebApplication.CreateBuilder` loads app configuration in this order, from highest to lowest priority:

1. Command-line arguments.
2. Environment variables not prefixed with `ASPNETCORE_` or `DOTNET_`.
3. User secrets, when the environment is `Development`.
4. `appsettings.{Environment}.json`.
5. `appsettings.json`.

A later provider overrides an earlier one key by key, not file by file. If `appsettings.json` sets `Shipping:FlatRate:Price` and `Shipping:FlatRate:Enabled`, and production only sets `Shipping__FlatRate__Price` as an environment variable, `Enabled` still comes from the file.

```json
{
  "ConnectionStrings": {
    "Catalog": "Host=localhost;Database=catalog"
  },
  "Shipping": {
    "FlatRate": { "Enabled": true, "Price": 15.0 }
  }
}
```

Hierarchy uses `:` in keys. Environment variables use a double underscore instead, because `:` does not work on every platform (Bash cannot use it in a variable name): `Shipping__FlatRate__Price=19.90` becomes `Shipping:FlatRate:Price`. A command-line override looks like `dotnet run -- --Shipping:FlatRate:Price=19.90`.

Reading raw values is possible and sometimes fine in `Program.cs`:

```csharp
var connectionString = builder.Configuration.GetConnectionString("Catalog");
var price = builder.Configuration.GetValue<decimal>("Shipping:FlatRate:Price");
```

`GetConnectionString("Catalog")` is shorthand for the `ConnectionStrings:Catalog` key. Outside `Program.cs`, prefer options.

## Secrets do not go in appsettings.json

`appsettings.json` is committed. For local development use user secrets, which live in your user profile, outside the repository, and load only in Development:

```bash
dotnet user-secrets init
dotnet user-secrets set "Payments:ApiKey" "sk_test_..."
```

In deployed environments the value comes from the platform (a secret store or protected environment variables). Module 08 covers secret management in production; the rule here is simply that a secret never appears in a committed file.

## Binding options

The options pattern binds a section to a class and injects it:

```csharp
using System.ComponentModel.DataAnnotations;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOptions<FlatRateOptions>()
    .BindConfiguration(FlatRateOptions.Section)
    .ValidateDataAnnotations()
    .ValidateOnStart();

var app = builder.Build();

app.MapGet("/shipping/flat-rate", (IOptions<FlatRateOptions> options) =>
    options.Value.Enabled ? Results.Ok(options.Value.Price) : Results.NotFound());

app.Run();

public sealed class FlatRateOptions
{
    public const string Section = "Shipping:FlatRate";

    public bool Enabled { get; set; }

    [Range(typeof(decimal), "0", "1000")]
    public decimal Price { get; set; }
}
```

An options class needs a public parameterless constructor and public read-write properties; fields are not bound. `ValidateDataAnnotations` applies attributes such as `[Required]` and `[Range]`, and `Validate(o => ..., "message")` adds rules that span several properties.

Without `ValidateOnStart`, validation runs the first time someone reads `.Value`, so a typo in production surfaces as an `OptionsValidationException` on the first request that needs the setting, possibly hours after the deploy. With it, the host fails at startup and the deploy fails visibly. Always add it to settings the app cannot work without.

## IOptions, IOptionsSnapshot, IOptionsMonitor

| Interface | Lifetime | Sees changes after startup |
| --- | --- | --- |
| `IOptions<T>` | singleton | no |
| `IOptionsSnapshot<T>` | scoped | yes, recomputed once per request |
| `IOptionsMonitor<T>` | singleton | yes, `CurrentValue` plus `OnChange` notifications |

By default the JSON files are loaded with `reloadOnChange: true`, so editing `appsettings.json` on a running server changes the configuration. Whether your code notices depends on the interface. `IOptions<T>` never does. `IOptionsSnapshot<T>` cannot be injected into a singleton, because it is scoped; use `IOptionsMonitor<T>` there. Environment variables cannot change inside a running process, so reload only matters for file-based providers. In containers, file change notifications can be unreliable; the documentation suggests `DOTNET_USE_POLLING_FILE_WATCHER=1` when you depend on them.

## In practice

- One options class per feature, bound to its own section and validated on start. Inject it where it is used, so each class depends only on the settings it reads.
- Use `IOptions<T>` by default. Choose `IOptionsMonitor<T>` only for settings you really change at runtime, such as feature switches, and design the code to read `CurrentValue` each time.
- Name keys the same way in every environment; deployments override with environment variables using `__`.
- Do not copy `core_config_data` scopes into JSON. Store-specific settings that admins edit belong in the database, cached if needed.
- Usual mistakes: a secret committed in `appsettings.json`, a `:` in an environment variable name set from a shell such as Bash, reading `IOptions<T>.Value` in a constructor and expecting it to change, and missing `ValidateOnStart`.

## Check yourself

1. `appsettings.Production.json` sets a price to 15 and the container sets `Shipping__FlatRate__Price=19.90`. Which value does the app use, and why?
2. Where do `env.php`, `config.php` and `core_config_data` each map in an ASP.NET Core app?
3. What is the practical difference between validating options on first use and on start?
4. Which options interface would you inject into a singleton that must react to a feature switch edited in a file?
