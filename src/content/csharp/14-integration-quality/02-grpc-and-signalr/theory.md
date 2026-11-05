# gRPC and SignalR

After this lesson you can choose between a JSON HTTP API, gRPC and SignalR for a given integration. You will define a gRPC service from a `.proto` contract and call it with a generated client, write a SignalR hub that pushes updates to browsers, and explain how each one behaves when you run more than one instance.

## Coming from PHP/Magento

Magento speaks REST and GraphQL to the outside world, and SOAP for older integrations. Service-to-service calls inside a PHP shop are usually REST too, and "real time" means polling an endpoint every few seconds, or a separate Node.js or Mercure process that pushes events, because a PHP-FPM worker cannot hold thousands of open connections.

Two things change in .NET:

- **gRPC is a first-class option** for internal calls. The contract-first `.proto` file plays the role that a WSDL played for SOAP, but over HTTP/2 with binary Protobuf payloads and generated clients.
- **The web process itself can hold persistent connections.** SignalR runs inside your ASP.NET Core app. The trap: once connections live in process memory, scaling out to a second instance breaks broadcasts unless you add a backplane, and sticky sessions become a requirement again.

## Choosing

| Need | Use |
| --- | --- |
| Public or browser-facing API, third parties, caching | HTTP API with JSON (modules 05 and 06) |
| Internal service-to-service calls, strict contracts, streaming, polyglot teams | gRPC |
| Server pushes to many browsers: dashboards, notifications, chat | SignalR |

Microsoft's comparison page recommends gRPC for microservices, point-to-point real-time streaming, polyglot environments and network-constrained links, and an HTTP API for browser-accessible APIs. Browsers cannot call gRPC directly; gRPC-Web or JSON transcoding (`AddGrpc().AddJsonTranscoding()`, .NET 7 and later) bridge that gap. For broadcasting to many connected clients, the same page points to SignalR, because gRPC has no broadcast concept.

## A gRPC service

The contract, `Protos/stock.proto`:

```
syntax = "proto3";
option csharp_namespace = "Catalog.Grpc";
package stock;

service Stock {
  rpc GetLevel (StockRequest) returns (StockReply);
}

message StockRequest { string sku = 1; }
message StockReply { string sku = 1; int32 quantity = 2; }
```

The server project references `Grpc.AspNetCore` (which brings `Grpc.Tools`) and adds `<Protobuf Include="Protos\stock.proto" GrpcServices="Server" />` to the `.csproj`. The build generates an abstract `Stock.StockBase` class and the message types:

```csharp
using Catalog.Grpc;
using Grpc.Core;

public sealed class StockService(IStockReader reader) : Stock.StockBase
{
    public override async Task<StockReply> GetLevel(StockRequest request, ServerCallContext context)
    {
        var quantity = await reader.GetAsync(request.Sku, context.CancellationToken);
        return new StockReply { Sku = request.Sku, Quantity = quantity };
    }
}

public interface IStockReader
{
    Task<int> GetAsync(string sku, CancellationToken ct);
}

// Program.cs
builder.Services.AddGrpc();
// ...
app.MapGrpcService<StockService>();
```

The field numbers (`= 1`, `= 2`) are the wire contract. Never reuse or renumber them; add new fields with new numbers so old clients keep working.

On the client side, `Grpc.Net.ClientFactory` registers the generated client through `IHttpClientFactory`, so everything from lesson 01 applies:

```csharp
using Catalog.Grpc;

builder.Services.AddGrpcClient<Stock.StockClient>(o =>
    o.Address = new Uri("https://inventory.internal"));

// In a service that receives Stock.StockClient by DI:
var reply = await client.GetLevelAsync(
    new StockRequest { Sku = sku },
    deadline: DateTime.UtcNow.AddSeconds(2),
    cancellationToken: ct);
```

gRPC has **no default deadline**: without one, a call can wait forever. When the deadline passes, the client throws an `RpcException` with `StatusCode.DeadlineExceeded`, and the server's `context.CancellationToken` fires, which is why the service passes it on. If you add resilience handlers to every client (lesson 01, Aspire ServiceDefaults), their HTTP timeouts also cut gRPC calls made through `AddGrpcClient`, but set a deadline explicitly anyway: it reaches the server, an HTTP timeout does not.

## A SignalR hub

```csharp
using Microsoft.AspNetCore.SignalR;

public interface IStockClient
{
    Task StockChanged(string sku, int quantity);
}

public sealed class StockHub : Hub<IStockClient>
{
    public Task Watch(string sku) =>
        Groups.AddToGroupAsync(Context.ConnectionId, $"sku:{sku}");
}

// Program.cs
builder.Services.AddSignalR();
// ...
app.MapHub<StockHub>("/hubs/stock");

// Anywhere else, for example in the order worker's handler:
public sealed class StockNotifier(IHubContext<StockHub, IStockClient> hub)
{
    public Task NotifyAsync(string sku, int quantity) =>
        hub.Clients.Group($"sku:{sku}").StockChanged(sku, quantity);
}
```

`Hub<IStockClient>` makes client calls compile-time checked instead of `SendAsync("StockChanged", ...)` strings. A new hub instance serves every invocation, so never keep state in hub properties; use groups, `Context.Items` or a store. To send from outside a hub, inject `IHubContext`, never the hub itself. Groups are cleaned up automatically on disconnect.

## Scaling out

- **gRPC.** HTTP/2 multiplexes many calls on one long-lived TCP connection. A network (layer 4) load balancer, which Kubernetes uses by default, balances connections, not calls, so one pod can get all the traffic. Use an HTTP/2-aware (layer 7) proxy or client-side load balancing in `Grpc.Net.Client` (`round_robin` over a DNS resolver), and reuse the channel.
- **SignalR.** Each server only knows its own connections. With two instances, `Clients.All` reaches only half the users. Add a backplane: Azure SignalR Service (recommended on Azure; it also removes the need for sticky sessions) or Redis with `Microsoft.AspNetCore.SignalR.StackExchangeRedis` and `AddSignalR().AddStackExchangeRedis(...)`. With Redis you still need sticky sessions, unless every client uses WebSockets only with `SkipNegotiation`. Redis does not buffer: messages sent while it is down are lost.

## In practice

- Keep JSON HTTP for the edge and add gRPC only where its contract and performance pay off. Many teams never need it.
- Share `.proto` files through a repository or package, and review field-number changes like database migrations.
- Treat SignalR as a notification channel, not a source of truth. A client that reconnects reloads the current state over HTTP.
- Try it locally: create a service with `dotnet new grpc`, call it from a console client with a 1-second deadline, and add a delay in the service to see `DeadlineExceeded`.
- Common mistakes: gRPC calls without deadlines, a gRPC service behind a layer 4 balancer, a SignalR app scaled to two replicas without a backplane, and state stored in hub fields.

## Check yourself

1. A partner team needs stock levels from a browser single-page app and from three internal services. What would you expose to each, and why?
2. What happens to a gRPC call with no deadline when the server hangs, and what fires on the server when a deadline expires?
3. Your SignalR app runs on two Kubernetes pods with a Redis backplane. Which load balancer setting is still required?
