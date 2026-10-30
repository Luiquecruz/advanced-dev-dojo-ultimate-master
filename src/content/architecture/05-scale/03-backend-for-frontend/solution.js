const LATEST_POSTS_LIMIT = 3;

async function readJson(path) {
  try {
    const response = await fetch(path);
    return { ok: response.ok, status: response.status, data: response.ok ? await response.json() : null };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

function initialsOf(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0].toUpperCase())
    .join('');
}

function toPostSummary(post) {
  return { id: post.id, title: post.title };
}

export async function getProfilePage(userId) {
  const [userResult, postsResult] = await Promise.all([
    readJson(`/api/users/${userId}`),
    readJson(`/api/posts?userId=${userId}`),
  ]);

  if (userResult.status === 404) {
    return { status: 404, body: { error: 'User not found' } };
  }
  if (!userResult.ok) {
    return { status: 502, body: { error: 'Profile service unavailable' } };
  }

  const user = userResult.data;
  const profile = { name: user.name, initials: initialsOf(user.name) };

  if (!postsResult.ok) {
    return { status: 200, body: { ...profile, postCount: null, latestPosts: [], postsUnavailable: true } };
  }

  const latestPosts = [...postsResult.data]
    .sort((first, second) => second.id - first.id)
    .slice(0, LATEST_POSTS_LIMIT)
    .map(toPostSummary);

  return {
    status: 200,
    body: { ...profile, postCount: postsResult.data.length, latestPosts, postsUnavailable: false },
  };
}
