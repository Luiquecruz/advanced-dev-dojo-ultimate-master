Just render the tags inside your component: `<meta name="description" content={article.excerpt} />`. React moves them into `<head>` for you.
---
`<title>{article.title} | Dev Dojo</title>` produces an array of children. Build one string: ``<title>{`${article.title} | Dev Dojo`}</title>``.
---
`preconnect` and `preload` are plain function calls at the top of the component body: `preload('/fonts/inter.woff2', { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' });`.
