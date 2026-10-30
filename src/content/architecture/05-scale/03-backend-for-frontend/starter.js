const LATEST_POSTS_LIMIT = 3;

export async function getProfilePage(userId) {
  // TODO: start GET /api/users/:id and GET /api/posts?userId= at the same time and await both
  const userResponse = await fetch(`/api/users/${userId}`);
  const user = await userResponse.json();
  const postsResponse = await fetch(`/api/posts?userId=${userId}`);
  const posts = await postsResponse.json();

  // TODO: map an upstream 404 for the user to { status: 404, body: { error: 'User not found' } }
  // TODO: map any other user failure to { status: 502, body: { error: 'Profile service unavailable' } }
  // TODO: when the posts upstream fails, keep the page: postCount null, latestPosts [], postsUnavailable true
  // TODO: shape the view model: name, initials, postCount, the LATEST_POSTS_LIMIT newest posts as { id, title }, postsUnavailable false
  return { status: 200, body: { user, posts } };
}
