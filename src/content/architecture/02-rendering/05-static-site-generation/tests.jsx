function parse(html) {
  return new DOMParser().parseFromString(html, 'text/html');
}

function heading(html) {
  return parse(html).querySelector('main h1').textContent;
}

test('build returns the index, one page per post and the 404 page, as full HTML documents', async () => {
  const pages = await mod.build();
  expect(Object.keys(pages).sort()).toEqual(['/', '/404', '/posts/1', '/posts/2', '/posts/3', '/posts/4']);
  for (const html of Object.values(pages)) {
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
  }
  expect(heading(pages['/posts/3'])).toBe('The first bug');
  expect(parse(pages['/posts/3']).querySelector('article p').textContent).toBe('A moth was found in relay #70.');
  expect(heading(pages['/404'])).toBe('Not found');
});

test('the index page links to every post', async () => {
  const pages = await mod.build();
  const links = [...parse(pages['/']).querySelectorAll('main li a')].map((link) => [link.textContent, link.getAttribute('href')]);
  expect(links).toEqual([
    ['Notes on the Analytical Engine', '/posts/1'],
    ['Computing Machinery and Intelligence', '/posts/2'],
    ['The first bug', '/posts/3'],
    ['Apollo guidance', '/posts/4'],
  ]);
});

test('generateStaticParams derives the paths from the data, not from a hard-coded list', async () => {
  const fresh = [
    { id: 7, userId: 1, title: 'Static by default', body: 'Built once.' },
    { id: 12, userId: 2, title: 'Edge caching', body: 'Served everywhere.' },
  ];
  mockApi('/api/posts', ({ url }) => {
    const id = url.pathname.split('/')[3];
    return id ? fresh.find((post) => post.id === Number(id)) : fresh;
  });
  expect(await mod.generateStaticParams()).toEqual([{ id: '7' }, { id: '12' }]);
  const pages = await mod.build();
  expect(Object.keys(pages).sort()).toEqual(['/', '/404', '/posts/12', '/posts/7']);
  expect(heading(pages['/posts/12'])).toBe('Edge caching');
});

test('serving is a pure lookup: data changed after the build does not change the pages', async () => {
  const pages = await mod.build();
  const serve = mod.createStaticServer(pages);
  const requests = [];
  mockApi('/api/', ({ url }) => {
    requests.push(url.pathname);
    return { id: 1, userId: 1, title: 'Edited after the build', body: 'Too late.' };
  });
  const response = serve('/posts/1');
  expect(response.status).toBe(200);
  expect(heading(response.html)).toBe('Notes on the Analytical Engine');
  expect(serve('/posts/1/?ref=feed').html).toBe(pages['/posts/1']);
  expect(serve('/').html).toBe(pages['/']);
  await sleep(20);
  expect(requests).toEqual([]);
});

test('unknown paths answer 404 with the prebuilt not found page (no fallback rendering)', async () => {
  const pages = await mod.build();
  const serve = mod.createStaticServer(pages);
  for (const path of ['/posts/99', '/about', '/404']) {
    const response = serve(path);
    expect(response.status).toBe(404);
    expect(response.html).toBe(pages['/404']);
  }
});

test('pages are rendered to static markup and ship no script', async () => {
  const pages = await mod.build();
  for (const html of Object.values(pages)) {
    expect(html).not.toMatch(/<script/);
  }
  expect(source).toMatch(/renderToStaticMarkup\s*\(/);
});
