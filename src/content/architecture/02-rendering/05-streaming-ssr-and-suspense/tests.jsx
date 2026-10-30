const product = { name: 'Mechanical Keyboard', price: 120 };
const reviews = [
  { id: 1, author: 'Ada', text: 'Great feel' },
  { id: 2, author: 'Alan', text: 'A bit loud' },
];

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function failAfter(milliseconds, message) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(message)), milliseconds));
}

function readChunks(stream) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let pendingRead = null;
  let finished = false;

  async function readFor(milliseconds) {
    let text = '';
    while (!finished) {
      pendingRead ??= reader.read();
      const result = await Promise.race([pendingRead, sleep(milliseconds).then(() => null)]);
      if (result === null) {
        break;
      }
      pendingRead = null;
      if (result.done) {
        finished = true;
        break;
      }
      text += decoder.decode(result.value, { stream: true }).replaceAll('<!-- -->', '');
    }
    return text;
  }

  async function readAll() {
    let text = '';
    while (!finished) {
      text += await readFor(500);
    }
    return text;
  }

  return { readFor, readAll };
}

async function startRender(reviewsPromise, options) {
  return Promise.race([
    mod.renderPage({ product, reviewsPromise }, options),
    failAfter(1000, 'renderPage did not resolve before the reviews: the shell is waiting for the slow data'),
  ]);
}

test('the shell (header and the "Loading reviews…" fallback) streams before the reviews resolve', async () => {
  const deferredReviews = createDeferred();
  try {
    const stream = await startRender(deferredReviews.promise);
    const shell = await readChunks(stream).readFor(50);
    expect(shell).toContain('<h1>Mechanical Keyboard</h1>');
    expect(shell).toContain('Loading reviews…');
    expect(shell).not.toContain('Great feel');
  } finally {
    deferredReviews.resolve(reviews);
  }
});

test('when the reviews resolve, the same response streams them in after the fallback', async () => {
  const deferredReviews = createDeferred();
  try {
    const stream = await startRender(deferredReviews.promise);
    const chunks = readChunks(stream);
    const shell = await chunks.readFor(50);
    deferredReviews.resolve(reviews);
    const rest = await chunks.readAll();
    expect(shell).not.toContain('Great feel');
    expect(rest).toContain('Ada: Great feel');
    expect(rest).toContain('Alan: A bit loud');
    expect(rest).toMatch(/<script/);
    const html = shell + rest;
    expect(html.indexOf('Great feel')).toBeGreaterThan(html.indexOf('Loading reviews…'));
  } finally {
    deferredReviews.resolve(reviews);
  }
});

test('stream.allReady resolves only after the reviews resolve', async () => {
  const deferredReviews = createDeferred();
  try {
    const stream = await startRender(deferredReviews.promise);
    const chunks = readChunks(stream);
    let allReady = false;
    stream.allReady.then(() => {
      allReady = true;
    });
    await chunks.readFor(50);
    expect(allReady).toBe(false);
    deferredReviews.resolve(reviews);
    await chunks.readAll();
    await stream.allReady;
    expect(allReady).toBe(true);
  } finally {
    deferredReviews.resolve(reviews);
  }
});

test('a failing reviews request keeps the shell, leaves the fallback and is reported through onError', async () => {
  const deferredReviews = createDeferred();
  deferredReviews.promise.catch(() => undefined);
  const onError = fn();
  const stream = await startRender(deferredReviews.promise, { onError });
  const chunks = readChunks(stream);
  const shell = await chunks.readFor(50);
  deferredReviews.reject(new Error('Reviews service is down'));
  const html = shell + (await chunks.readAll());
  expect(html).toContain('<h1>Mechanical Keyboard</h1>');
  expect(html).toContain('Loading reviews…');
  expect(html).not.toContain('Great feel');
  expect(onError).toHaveBeenCalled();
  expect(onError.mock.calls[0][0].message).toBe('Reviews service is down');
});

test('streams with renderToReadableStream and reads the data with use()', () => {
  expect(source).toMatch(/renderToReadableStream\s*\(/);
  expect(source).not.toMatch(/renderToString\s*\(/);
  expect(source).toMatch(/\buse\s*\(/);
});
