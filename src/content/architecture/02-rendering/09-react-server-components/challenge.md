Build a toy Server Components renderer to see where the boundary sits. The sandbox plays both sides: `renderToPayload` is the "server" that turns a React tree into a JSON payload, and `renderFromPayload` is the "client" that turns the payload back into React elements. This is a teaching model: the real Flight protocol streams rows, references client modules through the bundler manifest and supports promises, `Date`, `Map` and Server Functions. The boundary rules are the same.

Already written in `App.jsx`:

- `markAsClient(name, Component)` sets `Component.$$client = name`. It stands in for `'use client'`.
- Client components `AddToCart` (`Add to cart (0)` button and `Total: $0`) and `Tabs` (`Show <label>` button that reveals its `children` in a `region` named after `label`), and the client manifest `clientComponents = { AddToCart, Tabs }`.
- Server components `ProductPage({ productId })` (async, reads a private `database` whose product has a `costPrice` that must never reach the client) and `Specifications`.

**`renderToPayload(node)`** (named export, async) returns a JSON-serializable value:

- `null`, `undefined` and booleans become `null`; strings and numbers stay; arrays are rendered item by item (done in the starter).
- A **function** anywhere (a prop, a child) throws an `Error` whose message contains `Functions cannot be passed directly to Client Components`.
- A `Fragment` element renders its `children`.
- A **host element** (`type` is a string) becomes `{ $element: type, key, props }`, with every prop (including `children`) rendered to the payload.
- A **client component** (`type.$$client` is set) becomes `{ $client: type.$$client, key, props }`, with its props rendered to the payload. It is **never called** on the server. Its `children` are rendered on the server first, so a server component passed as children fills the slot as finished output.
- A **server component** (any other function type) is called with its props, awaited (it may be `async`), and whatever it returns is rendered to the payload. Its code and its data stay on the server; only its output travels.
- Any other object (props, `style`, data) keeps its keys with every value rendered to the payload.

**`renderFromPayload(payload, components)`** (named export) returns something React can render:

- Primitives and `null` stay; arrays are rebuilt item by item (done in the starter).
- `{ $element }` becomes `createElement(tag, props, ...children)`; `{ $client }` becomes `createElement(components[name], props, ...children)`. Pass `key` only when it is not `null`, and spread an array of children as arguments.
- A `$client` name missing from `components` throws an `Error` whose message contains that name.
- Other objects keep their keys with every value rebuilt.

The tests send the payload through `JSON.parse(JSON.stringify(payload))` before rebuilding it, render the result and click the client components.
