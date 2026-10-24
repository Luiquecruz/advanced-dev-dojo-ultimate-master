import { preconnect, preload } from 'react-dom';

export default function ArticlePage({ article }) {
  preconnect('https://api.example.com');
  preload('/fonts/inter.woff2', { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' });

  return (
    <article>
      <title>{`${article.title} | Dev Dojo`}</title>
      <meta name="description" content={article.excerpt} />
      <link rel="canonical" href={`https://devdojo.dev/articles/${article.slug}`} />
      <h1>{article.title}</h1>
      <p>{article.excerpt}</p>
    </article>
  );
}
