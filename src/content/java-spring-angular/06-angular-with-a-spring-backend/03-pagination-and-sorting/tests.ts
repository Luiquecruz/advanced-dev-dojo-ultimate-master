const ALL_USERS = Array.from({ length: 25 }, (_, index) => {
  const number = String(index + 1).padStart(2, '0');
  return { id: index + 1, name: `User ${number}`, email: `user${number}@example.com` };
});

/** Answers GET /api/users the way a Spring controller returning a PagedModel does and records every query string. */
function installPagedUsers() {
  const requests: URLSearchParams[] = [];
  mockApi('/api/users', ({ url }) => {
    requests.push(url.searchParams);
    const size = Number(url.searchParams.get('size') ?? 20);
    const number = Number(url.searchParams.get('page') ?? 0);
    const [property, direction] = (url.searchParams.get('sort') ?? 'id,asc').split(',');
    const sorted = [...ALL_USERS].sort((first, second) => (first[property] < second[property] ? -1 : first[property] > second[property] ? 1 : 0));
    if (direction === 'desc') sorted.reverse();
    return {
      content: sorted.slice(number * size, number * size + size),
      page: { size, number, totalElements: ALL_USERS.length, totalPages: Math.ceil(ALL_USERS.length / size) },
    };
  });
  return requests;
}

const { provideHttpClient } = require('@angular/common/http');
const setup = () => render(mod.UserTable, { providers: [provideHttpClient()] });
const names = () => screen.queryAllByRole('row').slice(1).map((row) => row.querySelector('td')?.textContent);
const lastRequest = (requests: URLSearchParams[]) => requests[requests.length - 1];

test('toQueryParams() builds the page, size and optional sort parameters', () => {
  expect(mod.toQueryParams(0, 10, null)).toEqual({ page: 0, size: 10 });
  expect(mod.toQueryParams(2, 10, { property: 'name', direction: 'desc' })).toEqual({ page: 2, size: 10, sort: 'name,desc' });
});

// beginner mistake: Spring pages are zero-based, so the first request asks for page 0 while the screen says "Page 1"
test('the first request asks for page 0 and the screen reads "Page 1 of 3"', async () => {
  const requests = installPagedUsers();
  await setup();
  await waitFor(() => expect(names()).toHaveLength(10));
  expect(requests[0].get('page')).toBe('0');
  expect(requests[0].get('size')).toBe('10');
  expect(requests[0].has('sort')).toBe(false);
  expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
  expect(names()[0]).toBe('User 01');
});

test('Next and Previous move through the pages and are disabled at both ends', async () => {
  const requests = installPagedUsers();
  await setup();
  await waitFor(() => expect(names()).toHaveLength(10));
  expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await waitFor(() => expect(screen.getByText('Page 2 of 3')).toBeInTheDocument());
  expect(lastRequest(requests).get('page')).toBe('1');
  expect(names()[0]).toBe('User 11');
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await waitFor(() => expect(screen.getByText('Page 3 of 3')).toBeInTheDocument());
  expect(names()).toHaveLength(5);
  expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Previous' }));
  await waitFor(() => expect(screen.getByText('Page 2 of 3')).toBeInTheDocument());
});

test('clicking a column sorts ascending first, then descending, using the property,direction format', async () => {
  const requests = installPagedUsers();
  await setup();
  await waitFor(() => expect(names()).toHaveLength(10));
  await user.click(screen.getByRole('button', { name: 'Name' }));
  await waitFor(() => expect(lastRequest(requests).get('sort')).toBe('name,asc'));
  await waitFor(() => expect(names()[0]).toBe('User 01'));
  await user.click(screen.getByRole('button', { name: 'Name' }));
  await waitFor(() => expect(lastRequest(requests).get('sort')).toBe('name,desc'));
  await waitFor(() => expect(names()[0]).toBe('User 25'));
  await user.click(screen.getByRole('button', { name: 'Email' }));
  await waitFor(() => expect(lastRequest(requests).get('sort')).toBe('email,asc'));
});

test('changing the sort order returns to the first page', async () => {
  const requests = installPagedUsers();
  await setup();
  await waitFor(() => expect(names()).toHaveLength(10));
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await waitFor(() => expect(screen.getByText('Page 2 of 3')).toBeInTheDocument());
  await user.click(screen.getByRole('button', { name: 'Name' }));
  await waitFor(() => expect(screen.getByText('Page 1 of 3')).toBeInTheDocument());
  expect(lastRequest(requests).get('page')).toBe('0');
  expect(lastRequest(requests).get('sort')).toBe('name,asc');
});
