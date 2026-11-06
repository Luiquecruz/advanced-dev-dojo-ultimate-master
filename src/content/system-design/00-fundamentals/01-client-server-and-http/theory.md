# Client-Server Architecture & HTTP Basics

Every system in this track, from a to-do app to a ride-hailing platform, starts with the same conversation: a client asks, a server answers. This lesson names the pieces of that conversation (DNS, TCP, HTTP, methods and status codes) so that later lessons can talk about scaling each piece without stopping to define it.

You need: nothing. This is the first lesson of the track.

## Clients and servers

A **client** is the program that starts a conversation: a browser, a mobile app, or another server calling an API. A **server** is a program that waits for requests and answers them. The same machine can be both: an API server is a server for the mobile app and a client of the database.

The relationship is asymmetric on purpose. Clients come and go, run on devices you do not control and can be modified by anyone. The server is the single place where rules are enforced: validation, permissions, prices. Never trust a value only because the client computed it.

## From a name to a connection

When a browser opens `https://api.example.com/notes/1`, three things happen before any application code runs:

1. **DNS** (Domain Name System) turns the name `api.example.com` into an IP address, the number that identifies a machine on the network. Answers are cached for a time-to-live, so a changed address takes a while to reach every client.
2. **TCP** (Transmission Control Protocol) opens a connection to that address and a port (443 for HTTPS). TCP delivers bytes reliably and in order: it retransmits lost packets and it knows nothing about URLs, methods or JSON.
3. **TLS** (Transport Layer Security) checks the server's certificate and encrypts the connection, so the client knows it reached the real server and nobody in between can read the bytes or change them unnoticed.

Only then does the client send an HTTP request over that connection. (HTTP/3 runs over QUIC instead, a protocol that does the jobs of TCP and TLS in one combined handshake.)

## HTTP: the request-response cycle

**HTTP** (Hypertext Transfer Protocol) is the language spoken over the connection. A request has a method, a path, headers and an optional body; a response has a status code, headers and an optional body:

```text
GET /notes/1 HTTP/1.1          HTTP/1.1 200 OK
Host: api.example.com          Content-Type: application/json
Accept: application/json
                               {"id":1,"text":"Buy milk"}
```

The **method** says what the client wants to do with the resource named by the path:

| Method | Meaning | Same effect if repeated? |
| --- | --- | --- |
| `GET` | read a resource | yes, it changes nothing |
| `POST` | create a resource or trigger an action | no, two calls may create two notes |
| `PUT` | replace a resource | yes, the resource ends in the same state every time |
| `DELETE` | remove a resource | yes, deleting twice leaves it deleted |

A method whose effect on the server is the same whether the request arrives once or several times is **idempotent**; the response may differ (a second `DELETE` answers `404`). `GET` is also **safe**: it only reads. Idempotency matters as soon as networks fail: a client that never got an answer can safely retry an idempotent request.

## Status codes

The status code is how the server tells the client what happened, and clients, proxies and monitoring tools act on it without reading the body:

- **2xx success**: `200 OK`, `201 Created` (a new resource exists), `204 No Content`.
- **4xx client error**: the request is wrong and retrying it unchanged will not help. `400 Bad Request` (invalid input), `401 Unauthorized` (who are you?), `403 Forbidden` (you may not), `404 Not Found` (no such resource), `405 Method Not Allowed` (the path exists but not with this method; the `Allow` header lists the methods it accepts). `429 Too Many Requests` is the exception: the same request can succeed after waiting (a `Retry-After` header, when present, says how long).
- **5xx server error**: the server failed. `500 Internal Server Error`, `503 Service Unavailable`. A retry later may succeed.

The split between 4xx and 5xx is what lets a client decide whether to retry, and what lets an alert fire when the server, not the user, is the problem.

## Common mistakes

- **Confusing HTTP with TCP.** TCP moves bytes reliably between two machines; HTTP gives those bytes meaning (methods, paths, status codes). A "connection refused" is a TCP problem before any HTTP exists; a `404` is an HTTP answer over a working connection.
- **Answering every error with `200`** and an `"error"` field in the body. Caches store it, clients treat it as success and monitoring never sees a failure.
- **Using `GET` for actions that change data.** Browsers, crawlers and proxies repeat `GET` requests freely, so a link that deletes a note will eventually delete it by accident.

## In practice

Read an endpoint as a contract: the method states the intent, the path names the resource and the status code reports the outcome. When you design an API, decide the status codes before the body: what does the client receive when the input is invalid, when the resource does not exist, when the method is wrong? Those answers become the behavior every client, retry policy and dashboard relies on.

## Check yourself

1. A request to `https://shop.example.com` fails before any HTTP response arrives. Which steps could have failed?
2. Why is it safe for a client to retry a `PUT` after a timeout but risky to retry a `POST`?
3. A client sends `DELETE /notes` and the server only supports `GET` and `POST` on that path. Which status code fits, and why not `404`?
