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
  const posts = await fetchJson('/api/posts');
  return posts.map((post) => ({ id: String(post.id) }));
}

export async function build() {
  const posts = await fetchJson('/api/posts');
  const params = await generateStaticParams();
  const postPages = await Promise.all(
    params.map(async ({ id }) => {
      const post = await fetchJson(`/api/posts/${id}`);
      return [`/posts/${id}`, toHtml(<PostPage post={post} />)];
    }),
  );

  return {
    '/': toHtml(<PostIndexPage posts={posts} />),
    ...Object.fromEntries(postPages),
    '/404': toHtml(<NotFoundPage />),
  };
}

export function createStaticServer(pages) {
  return function serve(path) {
    const pathname = path.split(/[?#]/)[0];
    const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
    if (normalizedPath !== '/404' && normalizedPath in pages) {
      return { status: 200, html: pages[normalizedPath] };
    }
    return { status: 404, html: pages['/404'] };
  };
}
