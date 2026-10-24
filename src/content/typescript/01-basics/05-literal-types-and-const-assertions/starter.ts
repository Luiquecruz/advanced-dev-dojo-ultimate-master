// TODO: add a const assertion
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE'];

// TODO: derive the union from HTTP_METHODS
type HttpMethod = string;

// TODO: keep method as the literal "GET"
const defaultRequest = { url: '/api/users', method: 'GET' };

function describeRequest(request: { url: string; method: HttpMethod }): string {
  // TODO: return "<METHOD> <url>"
  return '';
}
