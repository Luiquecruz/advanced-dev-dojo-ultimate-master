import { preconnect, preload } from 'react-dom';

export default function ArticlePage({ article }) {
  // TODO: call preconnect('https://api.example.com')
  // TODO: preload the Inter font: '/fonts/inter.woff2' as a font, type 'font/woff2', crossOrigin 'anonymous'

  return (
    <article>
      {/* TODO: <title> with "{title} | Dev Dojo" as ONE string */}
      {/* TODO: <meta name="description"> and <link rel="canonical"> */}
      <h1>{article.title}</h1>
      <p>{article.excerpt}</p>
    </article>
  );
}
