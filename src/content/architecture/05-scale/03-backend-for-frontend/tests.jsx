const { getProfilePage } = mod;

function manyPosts(userId, count) {
  return Array.from({ length: count }, (_, index) => ({
    id: 10 + index,
    userId,
    title: `Post ${10 + index}`,
    body: 'Long body the page never shows.',
  }));
}

test('returns a view model with only the fields the profile page needs', async () => {
  const result = await getProfilePage(1);
  expect(result).toEqual({
    status: 200,
    body: {
      name: 'Ada Lovelace',
      initials: 'AL',
      postCount: 1,
      latestPosts: [{ id: 1, title: 'Notes on the Analytical Engine' }],
      postsUnavailable: false,
    },
  });
  expect(JSON.stringify(result)).not.toContain('ada@example.com');
});

test('keeps the 3 newest posts, newest first, as { id, title } only', async () => {
  mockApi('/api/posts', ({ url }) => manyPosts(Number(url.searchParams.get('userId')), 5));
  const { body } = await getProfilePage(2);
  expect(body.postCount).toBe(5);
  expect(body.latestPosts).toEqual([
    { id: 14, title: 'Post 14' },
    { id: 13, title: 'Post 13' },
    { id: 12, title: 'Post 12' },
  ]);
});

test('maps upstream failures of the user service to 404 and 502', async () => {
  await expect(getProfilePage(99)).resolves.toEqual({ status: 404, body: { error: 'User not found' } });
  mockApi('/api/users', () => jsonResponse({ error: 'Database timeout' }, 500));
  await expect(getProfilePage(1)).resolves.toEqual({ status: 502, body: { error: 'Profile service unavailable' } });
});

test('degrades instead of failing when the posts service is down or unreachable', async () => {
  const degraded = {
    status: 200,
    body: { name: 'Grace Hopper', initials: 'GH', postCount: null, latestPosts: [], postsUnavailable: true },
  };
  mockApi('/api/posts', () => jsonResponse({ error: 'Service unavailable' }, 503));
  await expect(getProfilePage(3)).resolves.toEqual(degraded);
  mockApi('/api/posts', () => {
    throw new TypeError('fetch failed');
  });
  await expect(getProfilePage(3)).resolves.toEqual(degraded);
});

test('calls both upstream services in parallel', async () => {
  const timeline = [];
  mockApi('/api/users', async () => {
    timeline.push('users:start');
    await sleep(60);
    timeline.push('users:end');
    return { id: 4, name: 'Linus Torvalds', email: 'linus@example.com', role: 'editor' };
  });
  mockApi('/api/posts', async () => {
    timeline.push('posts:start');
    await sleep(60);
    timeline.push('posts:end');
    return [];
  });
  const result = await getProfilePage(4);
  expect(result.status).toBe(200);
  expect(timeline.indexOf('posts:start')).toBeGreaterThanOrEqual(0);
  expect(timeline.indexOf('posts:start')).toBeLessThan(timeline.indexOf('users:end'));
});
