1. Call `preconnect` and `preload` at the top of the component; React deduplicates repeated calls on re-render.
2. Render `<title>` with a template literal so it has a single string child.
3. Render the description `<meta>` and the canonical `<link>` built from the slug.
4. Keep the visible content in the `<article>`; React hoists only the metadata tags into `<head>` and removes them when the component unmounts.
