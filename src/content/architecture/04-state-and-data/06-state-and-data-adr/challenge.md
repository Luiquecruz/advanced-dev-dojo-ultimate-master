Write the state and data ADR for **Larder**, a grocery delivery web app.

## Briefing

- Today every piece of state lives in one global store. Product lists are copied into it with `useEffect` and go stale, aisle links shared on messaging apps open on the wrong aisle, and a double click once charged a customer twice.
- The pieces of state:

| State | What it is |
| --- | --- |
| `products` | the product list of the current aisle, from `GET /products?aisle=`, owned by the server |
| `currentUser` | name and default address, from `GET /me`, owned by the server |
| `aisle` | the selected aisle; links are shared and must survive a reload |
| `page` | the page of the product list; links are shared and must survive a reload |
| `cart` | items added before checkout, read by the header badge and by the checkout route; sent to the server only when the order is placed |
| `cartTotal` | the sum of the cart line prices |
| `addressDraft` | the delivery address being typed, with field errors |
| `isFilterPanelOpen` | whether the filter panel of the aisle page is expanded |
| `checkoutStep` | cart → slot → payment → confirming → done or failed; payment cannot be submitted twice and the user cannot go back while confirming |

## Task

In `adr.js`, export two constants.

**`adr`**, the record:

- `id`: a positive integer.
- `title`: at least 10 characters.
- `status`: `'accepted'`.
- `layer`: `'state-and-data'`.
- `context`: at least 80 characters, mentions both `server` and `client` state.
- `decision`: at least 40 characters, starts with `We will`.
- `alternatives`: at least two `{ option, reason }` objects with distinct `option` texts (at least 3 characters) and a `reason` of at least 20 characters explaining why it was rejected.
- `consequences`: `{ positive: [...], negative: [...] }`, each with at least one item of at least 15 characters.

**`stateMap`**: exactly one `{ state, home, reason }` per briefing piece, where `reason` has at least 15 characters and `home` is one of:

| Home | Meaning |
| --- | --- |
| `'server-cache'` | TanStack Query, SWR or RTK Query |
| `'url'` | path or search params |
| `'form'` | a form library such as React Hook Form |
| `'local'` | `useState` / `useReducer` in a component |
| `'client-store'` | Context or a small store (Zustand, Jotai, Redux Toolkit) |
| `'state-machine'` | XState or a status reducer with guarded transitions |
| `'derived'` | computed during render, never stored |

The map must be coherent with the briefing:

1. Data owned by the server lives in `'server-cache'`, never in a client store.
2. State that must survive a reload or a shared link lives in `'url'`.
3. Values computed from other state are `'derived'`.
4. `'client-store'` holds exactly the state read on different routes and owned by the client.
5. The guarded checkout flow is a `'state-machine'`.
6. The address draft lives in `'form'` or `'local'`.

The tests check structure and coherence, not your wording.
