# Reading ASP.NET MVC 5 and Web API 2

After this lesson you can open a classic `System.Web` solution and find your way: where the app starts, where configuration and routes live, how an MVC 5 controller differs from a Web API 2 controller, and what each piece becomes in ASP.NET Core. The goal is reading and safely changing legacy code, not writing new code in it.

## Coming from PHP/Magento

A lot of the shape is familiar. `Global.asax` plays the role of Magento's bootstrap (`app/bootstrap.php`): code that runs once when the app starts. `web.config` is `env.php`, `config.php` and the `.htaccess`/nginx rules in one XML file. Routes are registered in code in `App_Start`, a little like `routes.xml` plus a front controller. Controllers return results that a view engine (Razor, `.cshtml`) renders, the way a Magento controller returns a page result rendered from layout XML and `.phtml` templates.

The trap is `HttpContext.Current`. It looks like PHP's superglobals (`$_SERVER`, `$_SESSION`): a static you can read from anywhere, and legacy code does exactly that, deep in business classes. In PHP every line runs inside a request, so `$_SESSION` is always there. In ASP.NET it is tied to the request's thread context: in a background thread, a timer or a fire-and-forget task it is `null`. It is not part of ASP.NET Core: the System.Web adapters can supply it during a migration (lesson 4), but the goal is to replace it with an injected `HttpContext` or `IHttpContextAccessor`. Every `HttpContext.Current` you find is a migration cost.

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
- **Sync over async deadlocks.** Classic ASP.NET has a synchronization context. Calling `.Result` or `.Wait()` on a task whose continuation needs that context blocks the request thread forever. ASP.NET Core has no such context, so the same code "only" starves the thread pool (module 04).

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

## In practice

When you inherit a `System.Web` app, map it before changing it: read `Application_Start`, list the modules in `web.config`, find the DI registration and the OWIN `Startup`, and search for `HttpContext.Current`, `Session[` and `ConfigurationManager`. Those searches estimate the migration better than line counts. To build and run it you need Windows and Visual Studio; the `dotnet` CLI does not work for ASP.NET Framework apps.

Usual mistakes: adding a filter to `GlobalFilters` and expecting it on API routes; reading config through `ConfigurationManager` in a library you plan to share with ASP.NET Core; and "fixing" a hang by adding another `.Result`.

## Check yourself

- A request to `/api/orders/7` returns 404 although `OrdersController.GetOrder(int id)` exists. Which two files would you open first, and what would you look for?
- Why is `HttpContext.Current` inside a repository class a bigger migration problem than the same call inside a controller?
- What would you check in `web.config` before handing a copy of the project to a contractor?
