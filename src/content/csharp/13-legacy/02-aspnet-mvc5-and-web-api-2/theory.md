# Reading ASP.NET MVC 5 and Web API 2

After this lesson you can open a classic `System.Web` solution and find your way: where the app starts, where configuration and routes live, how an MVC 5 controller differs from a Web API 2 controller, and what each piece becomes in ASP.NET Core. The goal is reading and safely changing legacy code, not writing new code in it.

You need: 04/02 (async and `.Result`), 05/01 to 05/05 (the ASP.NET Core host, DI, configuration and middleware), 06/01 (controllers) and lesson 1 of this module.

## The shape of a `System.Web` app

`Global.asax` holds code that runs once when the app starts. `web.config` is one XML file for settings, connection strings and web server rules. Routes are registered in code in `App_Start`. Controllers return results that a view engine (Razor, `.cshtml`) renders.

One static runs through it all: `HttpContext.Current`, the current request, readable from anywhere, and legacy code reads it deep in business classes. It is tied to the request's thread context, so in a background thread, a timer or a fire-and-forget task it is `null`. ASP.NET Core does not have it: the System.Web adapters can supply it during a migration (lesson 4), but the goal is an injected `HttpContext` or `IHttpContextAccessor`. Every `HttpContext.Current` you find is a migration cost.

## How a request reaches your code

On .NET Framework, IIS hosts the app in-process. A request passes the HTTP modules registered in `web.config` (authentication, session, custom logging), each hooking events such as `BeginRequest` and `AuthenticateRequest`. Routing then picks a handler: the MVC handler or the Web API message pipeline. Both are packages on top of `System.Web` (MVC 5 is `System.Web.Mvc`, Web API 2 is `System.Web.Http`), and they are **two separate frameworks** that happen to live in the same project.

## Global.asax and App_Start

```csharp
// .NET Framework 4.8 code (Global.asax.cs): does not build on .NET 10
public class MvcApplication : System.Web.HttpApplication
{
    protected void Application_Start()
    {
        AreaRegistration.RegisterAllAreas();
        GlobalConfiguration.Configure(WebApiConfig.Register);      // Web API routes
        FilterConfig.RegisterGlobalFilters(GlobalFilters.Filters);  // MVC filters
        RouteConfig.RegisterRoutes(RouteTable.Routes);              // MVC routes
        BundleConfig.RegisterBundles(BundleTable.Bundles);          // CSS/JS bundling
    }
}

public static class RouteConfig
{
    public static void RegisterRoutes(RouteCollection routes)
    {
        routes.IgnoreRoute("{resource}.axd/{*pathInfo}");
        routes.MapRoute(
            name: "Default",
            url: "{controller}/{action}/{id}",
            defaults: new { controller = "Home", action = "Index", id = UrlParameter.Optional });
    }
}
```

Read `Application_Start` first in any legacy app: it lists every subsystem. Other `Application_*` methods (`Application_Error`, `Application_BeginRequest`) are global event handlers, often hiding logging or redirects.

## web.config

```xml
<configuration>
  <appSettings>
    <add key="Catalog:PageSize" value="20" />
  </appSettings>
  <connectionStrings>
    <add name="Catalog" connectionString="Server=.;Database=Catalog;Integrated Security=true" providerName="System.Data.SqlClient" />
  </connectionStrings>
  <system.web>
    <compilation targetFramework="4.8" />
    <customErrors mode="RemoteOnly" />
  </system.web>
  <system.webServer>
    <modules>
      <add name="AuditModule" type="Shop.Web.AuditModule" />
    </modules>
  </system.webServer>
</configuration>
```

Code reads it statically: `ConfigurationManager.AppSettings["Catalog:PageSize"]` and `ConfigurationManager.ConnectionStrings["Catalog"].ConnectionString`. Per-environment values come from transform files (`Web.Release.config`) applied at publish, not from environment variables. Production secrets are frequently committed in these files; check before you copy one anywhere. Note the `System.Data.SqlClient` provider name: that client is deprecated, and modern code uses `Microsoft.Data.SqlClient`.

## MVC 5 and Web API 2 controllers

```csharp
// .NET Framework 4.8 code: does not build on .NET 10
// ... _repository is injected through a third-party container in both classes
public class ProductsController : System.Web.Mvc.Controller        // HTML pages
{
    public ActionResult Index() => View(_repository.All());        // Views/Products/Index.cshtml

    [HttpPost, ValidateAntiForgeryToken]
    public ActionResult Edit(ProductForm form)
    {
        if (!ModelState.IsValid) return View(form);
        _repository.Save(form);
        return RedirectToAction("Index");
    }
}

public class ProductsApiController : System.Web.Http.ApiController // JSON or XML
{
    public IHttpActionResult GetProduct(int id)                    // GET api/productsapi/5
    {
        var product = _repository.Find(id);
        if (product == null) return NotFound();
        return Ok(product);
    }
}
```

Web API 2's default route is `api/{controller}/{id}`, and an action is chosen by HTTP verb: a method whose name starts with `Get` answers GET. `config.MapHttpAttributeRoutes()` enables `[RoutePrefix]`/`[Route]` attributes, which many apps mix with the convention. Because the frameworks are separate, almost everything exists twice: two `Controller` base types, two `[HttpPost]` attributes, two filter pipelines, two `DependencyResolver` hooks. A global MVC filter does not run for Web API calls, which is a classic source of "auth works on pages but not on the API" bugs.

## DI, auth and async in the old stack

- **No built-in container.** Apps plug in Autofac, Unity, Ninject or Simple Injector through `DependencyResolver.SetResolver(...)` (MVC) and `config.DependencyResolver` (Web API). Lifetimes are per-request by convention of that library; read its registration module before touching anything.
- **OWIN/Katana.** A `Startup` class marked `[assembly: OwinStartup(...)]` often configures cookie or bearer authentication with `Microsoft.Owin` middleware, a halfway house between modules and ASP.NET Core middleware.
- **Sync over async deadlocks.** Classic ASP.NET has a synchronization context. Calling `.Result` or `.Wait()` on a task whose continuation needs that context blocks the request thread forever. ASP.NET Core has no such context, so the same code "only" starves the thread pool (04/05).

## What each piece becomes

| System.Web | ASP.NET Core on .NET 10 |
| --- | --- |
| `Global.asax`, `App_Start/*Config` | `Program.cs` |
| `web.config` `appSettings`, transforms | `appsettings.json`, environment variables, Options |
| HTTP modules, `Application_BeginRequest` | middleware |
| `Controller` and `ApiController` | one `ControllerBase`/`Controller` model, or minimal APIs |
| `IHttpActionResult` | `IActionResult`, `ActionResult<T>`, `IResult` |
| third-party `DependencyResolver` | built-in `IServiceCollection` |
| `HttpContext.Current` | `HttpContext` passed in, or `IHttpContextAccessor` |

```csharp
// .NET 10: the same configuration and endpoint
var builder = WebApplication.CreateBuilder(args);
var pageSize = builder.Configuration.GetValue("Catalog:PageSize", 20);
var connectionString = builder.Configuration.GetConnectionString("Catalog");
builder.Services.AddControllers();

var app = builder.Build();
app.MapControllers();
app.MapGet("/api/products/{id:int}", (int id) =>
    id == 1 ? Results.Ok(new { id, name = "Tomato Soup" }) : Results.NotFound());
app.Run();
```

## Common mistakes

- **`HttpContext.Current` in a background task.** Code that reads `HttpContext.Current.Session` works in a controller and throws `NullReferenceException` from `Task.Run`, because no request is current there. Pass the values the task needs as arguments.
- **A filter in `GlobalFilters` expected on API routes.** MVC and Web API are separate frameworks, so an MVC filter never runs for `/api/*`. Register Web API filters in `config.Filters` in `WebApiConfig`.
- **`ConfigurationManager` in a library you plan to share.** ASP.NET Core does not read `web.config`, so the shared library gets `null` settings. Pass settings in through the constructor.
- **"Fixing" a hang with another `.Result`.** It deadlocks on the synchronization context. Make the call chain `async` end to end.

## In practice

When you inherit a `System.Web` app, map it before changing it: read `Application_Start`, list the modules in `web.config`, find the DI registration and the OWIN `Startup`, and search for `HttpContext.Current`, `Session[` and `ConfigurationManager`. Those searches estimate the migration better than line counts. To build and run it you need Windows and Visual Studio; the `dotnet` CLI does not work for ASP.NET Framework apps.

## Check yourself

- A request to `/api/orders/7` returns 404 although `OrdersController.GetOrder(int id)` exists. Which two files would you open first, and what would you look for?
- Why is `HttpContext.Current` inside a repository class a bigger migration problem than the same call inside a controller?
- What would you check in `web.config` before handing a copy of the project to a contractor?
