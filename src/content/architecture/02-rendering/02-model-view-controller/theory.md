## From files to a program per request

Static pages could not show a price from a database or reuse a layout without copying it. The answer was to put a **program** behind the URL: CGI and PHP scripts first, then structured frameworks such as Ruby on Rails, Django, Laravel, ASP.NET MVC and Express with templates. Most of them organized that program with **Model-View-Controller**.

| Question | Server-rendered MVC |
| --- | --- |
| Where is the HTML generated? | On the application server |
| When? | On every request |
| How much JS reaches the client? | Little or none; each navigation is a full page load |

This is a **multi-page application (MPA)**: every link and every form submission asks the server for a brand-new HTML document.

## The three roles

- **Model**: data and business rules. It knows how to load and validate products, talks to the database or another API, and knows nothing about HTML.
- **View**: turns data into HTML. In Rails it is ERB, in Django a template, in Laravel Blade. It receives data and returns markup; it never queries the database.
- **Controller**: the request flow. It reads the URL and parameters, asks the model for data, picks a view and an HTTP status.

```jsx
export async function handleRequest(url) {
  const { pathname, searchParams } = new URL(url, 'http://localhost');
  if (pathname === '/products') {
    const products = await findProducts(searchParams.get('q') ?? '');
    return render(200, <ProductListView products={products} />);
  }
  return render(404, <NotFoundView />);
}
```

React components make good views: a pure function from props to markup. `renderToStaticMarkup` turns them into an HTML string without the extra attributes hydration would need, because nothing will hydrate this page. Escaping comes for free: `{query}` is rendered as text, so `<script>` in a search box cannot inject markup. Template engines learned the same lesson by escaping output by default.

## How the browser experiences it

Navigation is plain HTML: `<a href="/products/4">` and `<form method="get" action="/products">`. The browser builds the URL (`/products?q=mo`), sends the request and replaces the whole page with the answer. That is robust: it works without JavaScript, the back button and bookmarks just work, and every page is indexable because the HTML already contains the content.

The cost is the **full page reload**. Every click re-downloads the layout, re-parses CSS, loses scroll and form state, and flashes a blank screen while the next document loads. Rich interactions (an editable table, a live search) need extra JavaScript sprinkled on top, often jQuery, duplicating rendering logic between the server templates and client scripts.

## MVC moves to the browser

To avoid reloads, MVC was reimplemented on the client around 2010: **Backbone.js** (models and collections synced with a REST API, views re-rendering on change), **AngularJS** (controllers, two-way binding) and Ember. The server stopped rendering pages and started returning JSON. That is the road to the single-page application in the next lesson, and two-way binding's tangled updates are part of why React chose one-way data flow.

## Where MVC survives today

The roles did not disappear; they were renamed:

| MVC role | React Router 7 / Remix | Next.js App Router |
| --- | --- | --- |
| Controller | route module + `loader` / `action` | route segment, `route.ts` handlers, Server Actions |
| Model | data layer called by loaders | data functions called by Server Components |
| View | the route component | the page component |

A loader that reads params, queries data and returns it to a component is a controller. The discipline is the same: views receive data, they do not fetch it.

## Pitfalls

- Fat views: querying data inside the template hides N+1 queries and makes views untestable.
- Fat controllers: business rules belong in the model, so other controllers and jobs can reuse them.
- Returning `200` for a missing record. Unknown ids are `404`, both for users and for crawlers.
- Building HTML with string concatenation of user input instead of an escaping view layer.

## When to choose it

Choose a server-rendered MPA when content and SEO matter more than app-like transitions: content sites, admin back offices, CRUD tools, e-commerce catalogs, and teams strong in a backend framework. Rails with Hotwire, Laravel with Livewire and htmx extend it with partial page updates. When the product needs long-lived client state and instant navigation, move to a SPA or a hybrid framework that keeps loaders (the controller) and adds client navigation.
