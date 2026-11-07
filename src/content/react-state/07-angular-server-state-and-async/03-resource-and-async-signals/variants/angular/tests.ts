const setup = (fetchProduct) => {
  TestBed.configureTestingModule({ providers: [{ provide: mod.FETCH_PRODUCT, useValue: fetchProduct }] });
  return TestBed.inject(mod.ProductDetail);
};
const fetcher = () =>
  fn(async (id, abortSignal) => ({ id, name: `Product ${id}` }));
const settle = async () => {
  await stable();
  await sleep(10);
  await stable();
};

test('loads the product for the current id and exposes its title', async () => {
  const fetchProduct = fetcher();
  const detail = setup(fetchProduct);
  expect(detail.title()).toBe('Loading...');
  await settle();
  expect(detail.product.status()).toBe('resolved');
  expect(detail.title()).toBe('Product 1');
  expect(fetchProduct).toHaveBeenCalledTimes(1);
});

test('changing the id loads the new product', async () => {
  const fetchProduct = fetcher();
  const detail = setup(fetchProduct);
  await settle();
  detail.select(2);
  await settle();
  expect(detail.title()).toBe('Product 2');
  expect(fetchProduct.mock.calls.map((call) => call[0])).toEqual([1, 2]);
});

test('a null id leaves the resource idle without a request', async () => {
  const fetchProduct = fetcher();
  const detail = setup(fetchProduct);
  detail.select(null);
  await settle();
  expect(detail.product.status()).toBe('idle');
  expect(fetchProduct).not.toHaveBeenCalled();
  expect(detail.title()).toBe('Loading...');
});

test('the loader receives an AbortSignal that is aborted when the id changes', async () => {
  const signals = [];
  const detail = setup(fn((id, abortSignal) => {
    signals.push(abortSignal);
    return new Promise(() => undefined);
  }));
  await settle();
  detail.select(2);
  await settle();
  expect(signals).toHaveLength(2);
  expect(signals[0]).toBeInstanceOf(AbortSignal);
  expect(signals[0].aborted).toBe(true);
});

test('reload() runs the loader again with the same id', async () => {
  const fetchProduct = fetcher();
  const detail = setup(fetchProduct);
  await settle();
  detail.reload();
  await settle();
  expect(fetchProduct).toHaveBeenCalledTimes(2);
  expect(fetchProduct.mock.calls.map((call) => call[0])).toEqual([1, 1]);
});
