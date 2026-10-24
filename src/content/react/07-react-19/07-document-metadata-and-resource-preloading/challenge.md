Build `ArticlePage`, the default export, which renders an article and declares its metadata and resources with React 19 APIs.

Props: `article` with `{ slug, title, excerpt }`.

1. Render `<title>` whose text is exactly `{title} | Dev Dojo` (one string child).
2. Render `<meta name="description" content={excerpt} />`.
3. Render `<link rel="canonical" href="https://devdojo.dev/articles/{slug}" />`.
4. During render, call:
   - `preconnect('https://api.example.com')`
   - `preload('/fonts/inter.woff2', { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' })`

   Both functions come from `react-dom`.
5. Render the content: `<article><h1>{title}</h1><p>{excerpt}</p></article>`.

Do not touch `document` directly and do not use effects: React must hoist the tags into `<head>`.
