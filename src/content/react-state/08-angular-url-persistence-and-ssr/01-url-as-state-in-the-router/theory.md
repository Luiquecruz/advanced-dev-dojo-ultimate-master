Before starting, complete [Router basics](/angular/router-basics) in the Angular track and the first module of this path.

Some state belongs to the page address: the active route, the search text, the sort order, the page number. Putting it in the URL gives you things a store cannot: **shareable links**, a working **back button**, **bookmarks** and a state that survives a reload without any storage code. The router is the single source of truth for navigable state.

## What goes where

| State | Place |
| --- | --- |
| Which screen and which record | route path and params (`/orders/42`) |
| Filters, search, sort, page | query params (`?q=ang&sort=price&page=2`) |
| Open dialog, hover, draft text | component signal, not the URL |
| User preferences | storage or server, not the URL |

A good test: would you paste this link to a colleague and expect them to see the same thing? Then it belongs in the URL.

## Reading it

Query params are an observable. Convert them to a signal and parse them into a typed value in one place:

```ts
private readonly route = inject(ActivatedRoute);

readonly filters = toSignal(
  this.route.queryParamMap.pipe(map(parseFilters)),
  { initialValue: DEFAULT_FILTERS },
);
```

With the router configured by `withComponentInputBinding()`, route and query params can also arrive directly as component inputs, which removes the injection for simple screens.

## Parsing is validation

URL text is user input. `?page=abc` or `?sort=<script>` must not crash or inject. A parser turns strings into a valid value with defaults:

```ts
export function parseFilters(params: ParamMap): Filters {
  const page = Number(params.get('page'));
  return {
    q: params.get('q') ?? '',
    sort: params.get('sort') === 'price' ? 'price' : 'name',
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}
```

Parse once at the boundary; the rest of the app handles a typed `Filters`.

## Writing it

Never write state to a local signal and **also** to the URL. Navigate, and let the signal derive from the navigation:

```ts
update(changes: Partial<Filters>) {
  void this.router.navigate([], {
    queryParams: toQueryParams({ ...this.filters(), ...changes }),
  });
}
```

Omit values equal to the default so links stay short. Reset the page to 1 when another filter changes, or users land on an empty page 7. Use `replaceUrl: true` for fast-changing input such as typing in a search box, so the back button is not flooded with entries.

## Component state or URL state?

| Choose the URL when | Choose the component when |
| --- | --- |
| it should survive reload and be shared | it is disposable UI state |
| back/forward should restore it | a new visit should start clean |
| it identifies "what the user is looking at" | it describes "how the widget feels right now" |

## Common mistakes

- Keeping filters in a store and the URL, so they disagree after back/forward.
- Trusting query params without parsing.
- Pushing a history entry for every keystroke.
- Putting large or sensitive data in the URL.
- Forgetting to reset pagination when filters change.

## When to choose it

Default to the URL for anything about which data the user is viewing. Keep everything else out of it.
