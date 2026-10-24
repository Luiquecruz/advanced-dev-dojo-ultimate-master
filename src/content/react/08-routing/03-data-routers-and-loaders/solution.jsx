import {
  createMemoryRouter,
  data,
  isRouteErrorResponse,
  Link,
  Outlet,
  RouterProvider,
  useLoaderData,
  useNavigation,
  useRouteError,
} from 'react-router';

export async function postsLoader() {
  const response = await fetch('/api/posts');
  return response.json();
}

export async function postLoader({ params }) {
  const response = await fetch(`/api/posts/${params.postId}`);
  if (!response.ok) {
    throw data('Post not found', { status: response.status });
  }
  return response.json();
}

function Layout() {
  const navigation = useNavigation();
  return (
    <main>
      {navigation.state === 'loading' && <p role="status">Loading...</p>}
      <Outlet />
    </main>
  );
}

function PostList() {
  const posts = useLoaderData();
  return (
    <section>
      <h1>Posts</h1>
      <ul>
        {posts.map((post) => (
          <li key={post.id}>
            <Link to={`/posts/${post.id}`}>{post.title}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PostDetail() {
  const post = useLoaderData();
  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.body}</p>
      <Link to="/posts">Back to posts</Link>
    </article>
  );
}

function PostError() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <h1>Post not found</h1>;
  }
  return <h1>Something went wrong</h1>;
}

export const routes = [
  {
    path: '/',
    element: <Layout />,
    hydrateFallbackElement: <p>Loading...</p>,
    children: [
      { path: 'posts', loader: postsLoader, element: <PostList /> },
      { path: 'posts/:postId', loader: postLoader, element: <PostDetail />, errorElement: <PostError /> },
    ],
  },
];

const router = createMemoryRouter(routes, { initialEntries: ['/posts'] });

export default function App() {
  return <RouterProvider router={router} />;
}
