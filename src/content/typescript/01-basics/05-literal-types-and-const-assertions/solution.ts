const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE'] as const;

type HttpMethod = (typeof HTTP_METHODS)[number];

const defaultRequest = { url: '/api/users', method: 'GET' } as const;

function describeRequest(request: { url: string; method: HttpMethod }): string {
  return `${request.method} ${request.url}`;
}
