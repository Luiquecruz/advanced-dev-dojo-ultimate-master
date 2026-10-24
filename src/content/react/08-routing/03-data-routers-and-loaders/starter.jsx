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
  // TODO: fetch /api/posts and return the parsed JSON
  return [];
}

export async function postLoader({ params }) {
  // TODO: fetch /api/posts/{params.postId}
  // TODO: throw data('Post not found', { status: response.status }) when the response is not ok
  return null;
}

function Layout() {
  // TODO: show <p role="status">Loading...</p> while navigation.state is 'loading'
  return (
    <main>
      <Outlet />
    </main>
  );
}

function PostList() {
  // TODO: read the posts with useLoaderData()
  const posts = [];
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
  // TODO: read the post with useLoaderData() and render its title, body and a link back
  return <article />;
}

function PostError() {
  // TODO: use useRouteError() and isRouteErrorResponse() to render "Post not found" for 404s
  return <h1>Something went wrong</h1>;
}

export const routes = [
  {
    path: '/',
    element: <Layout />,
    hydrateFallbackElement: <p>Loading...</p>,
    children: [
      // TODO: attach postsLoader to the posts route
      { path: 'posts', element: <PostList /> },
      // TODO: add the posts/:postId route with postLoader, PostDetail and PostError
    ],
  },
];

const router = createMemoryRouter(routes, { initialEntries: ['/posts'] });

export default function App() {
  return <RouterProvider router={router} />;
}
