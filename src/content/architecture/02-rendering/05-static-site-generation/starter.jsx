import { renderToStaticMarkup } from 'react-dom/server';

function Document({ title, children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>{title}</title>
      </head>
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}

export function PostIndexPage({ posts }) {
  return (
    <Document title="Posts">
      <h1>Posts</h1>
      <ul>
        {posts.map((post) => (
          <li key={post.id}>
            <a href={`/posts/${post.id}`}>{post.title}</a>
          </li>
        ))}
      </ul>
    </Document>
  );
}

export function PostPage({ post }) {
  return (
    <Document title={post.title}>
      <article>
        <h1>{post.title}</h1>
        <p>{post.body}</p>
      </article>
      <a href="/">All posts</a>
    </Document>
  );
}

export function NotFoundPage() {
  return (
    <Document title="Not found">
      <h1>Not found</h1>
      <a href="/">All posts</a>
    </Document>
  );
}

function toHtml(element) {
  return `<!DOCTYPE html>${renderToStaticMarkup(element)}`;
}

async function fetchJson(path) {
  const response = await fetch(path);
  return response.json();
}

export async function generateStaticParams() {
  // TODO: return one { id } (as a string) per post from /api/posts
  return [{ id: '1' }];
}

export async function build() {
  const posts = await fetchJson('/api/posts');
  // TODO: render one /posts/:id page per static param, with the post loaded from /api/posts/:id
  // TODO: add the /404 page
  return {
    '/': toHtml(<PostIndexPage posts={posts} />),
  };
}

export function createStaticServer(pages) {
  return function serve(path) {
    // TODO: ignore the query string, accept a trailing slash, answer 404 with pages['/404'] for unknown paths
    return { status: 200, html: pages[path] };
  };
}
