function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function createClock(start = 1_000_000) {
  let current = start;
  return {
    now: () => current,
    advanceSeconds: (seconds) => {
      current += seconds * 1000;
    },
  };
}

function queuedRender(...steps) {
  return fn(() => {
    const step = steps.shift();
    if (step instanceof Error) {
      return Promise.reject(step);
    }
    if (typeof step === 'string') {
      return Promise.resolve(step);
    }
    return step.promise;
  });
}

function answeredWithoutWaiting(response) {
  return Promise.race([
    response,
    sleep(100).then(() => {
      throw new Error('get(path) waited for the regeneration instead of answering with the stale page');
    }),
  ]);
}

async function flush() {
  await sleep(0);
}

test('the first request renders the page (MISS) and later requests inside the window reuse it (HIT)', async () => {
  const clock = createClock();
  const render = fn(async (path) => `<h1>${path} v1</h1>`);
  const server = mod.createIsrServer({ render, revalidateSeconds: 60, now: clock.now });

  await expect(server.get('/products/1')).resolves.toEqual({ html: '<h1>/products/1 v1</h1>', cache: 'MISS' });
  clock.advanceSeconds(59);
  await expect(server.get('/products/1')).resolves.toEqual({ html: '<h1>/products/1 v1</h1>', cache: 'HIT' });
  expect(render).toHaveBeenCalledTimes(1);
  expect(render).toHaveBeenCalledWith('/products/1');
});

test('after the window expires it answers with the stale page at once and regenerates in the background', async () => {
  const clock = createClock();
  const regeneration = createDeferred();
  const render = queuedRender('<p>price 120</p>', regeneration);
  const server = mod.createIsrServer({ render, revalidateSeconds: 60, now: clock.now });

  await server.get('/keyboard');
  clock.advanceSeconds(61);
  await expect(answeredWithoutWaiting(server.get('/keyboard'))).resolves.toEqual({ html: '<p>price 120</p>', cache: 'STALE' });
  expect(render).toHaveBeenCalledTimes(2);

  regeneration.resolve('<p>price 99</p>');
  await flush();
  await expect(server.get('/keyboard')).resolves.toEqual({ html: '<p>price 99</p>', cache: 'HIT' });
  expect(render).toHaveBeenCalledTimes(2);
});

test('concurrent requests for an expired page start exactly one regeneration', async () => {
  const clock = createClock();
  const regeneration = createDeferred();
  const render = queuedRender('old', regeneration);
  const server = mod.createIsrServer({ render, revalidateSeconds: 10, now: clock.now });

  await server.get('/home');
  clock.advanceSeconds(11);
  const responses = await answeredWithoutWaiting(Promise.all([server.get('/home'), server.get('/home'), server.get('/home')]));
  expect(responses).toEqual([
    { html: 'old', cache: 'STALE' },
    { html: 'old', cache: 'STALE' },
    { html: 'old', cache: 'STALE' },
  ]);
  expect(render).toHaveBeenCalledTimes(2);

  regeneration.resolve('new');
  await flush();
  await expect(server.get('/home')).resolves.toEqual({ html: 'new', cache: 'HIT' });
});

test('a failed regeneration keeps serving the last good page and the next request tries again', async () => {
  const clock = createClock();
  const render = queuedRender('good', new Error('CMS is down'), 'better');
  const server = mod.createIsrServer({ render, revalidateSeconds: 30, now: clock.now });

  await server.get('/blog');
  clock.advanceSeconds(31);
  await expect(server.get('/blog')).resolves.toEqual({ html: 'good', cache: 'STALE' });
  await flush();
  await expect(server.get('/blog')).resolves.toEqual({ html: 'good', cache: 'STALE' });
  expect(render).toHaveBeenCalledTimes(3);
  await flush();
  await expect(server.get('/blog')).resolves.toEqual({ html: 'better', cache: 'HIT' });
});

test('revalidatePath marks one page stale before the window expires and leaves other paths alone', async () => {
  const clock = createClock();
  let renderCount = 0;
  const render = fn(async (path) => {
    renderCount += 1;
    return `${path} rendered ${renderCount}`;
  });
  const server = mod.createIsrServer({ render, revalidateSeconds: 3600, now: clock.now });

  await server.get('/a');
  await server.get('/b');
  server.revalidatePath('/a');
  await expect(server.get('/a')).resolves.toEqual({ html: '/a rendered 1', cache: 'STALE' });
  await expect(server.get('/b')).resolves.toEqual({ html: '/b rendered 2', cache: 'HIT' });
  await flush();
  await expect(server.get('/a')).resolves.toEqual({ html: '/a rendered 3', cache: 'HIT' });
  expect(render).toHaveBeenCalledTimes(3);
});
