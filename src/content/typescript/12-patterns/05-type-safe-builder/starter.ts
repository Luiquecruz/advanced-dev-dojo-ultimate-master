type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';
type RequiredStep = 'url' | 'method';

interface HttpRequest {
  url: string;
  method: Method;
  headers: Record<string, string>;
  body?: string;
  timeoutMs: number;
}

// TODO: add Missing<Done>, BuildArgs<Done> and BodyArg<M>

// TODO: add the type parameters Done (completed required steps) and M (chosen method)
class RequestBuilder {
  #config: Partial<HttpRequest>;

  constructor(config: Partial<HttpRequest> = {}) {
    this.#config = config;
  }

  url(url: string): RequestBuilder {
    this.#config.url = url;
    return this;
  }

  method(method: Method): RequestBuilder {
    this.#config.method = method;
    return this;
  }

  header(name: string, value: string): RequestBuilder {
    this.#config.headers = { ...this.#config.headers, [name]: value };
    return this;
  }

  // TODO: only accept a body after method('POST') or method('PUT')
  body(body: string): RequestBuilder {
    this.#config.body = body;
    return this;
  }

  timeout(timeoutMs: number): RequestBuilder {
    this.#config.timeoutMs = timeoutMs;
    return this;
  }

  // TODO: make build() a compile error until url and method are set, and return a new builder from every step
  build(): HttpRequest {
    const { url = '', method = 'GET', headers = {}, body, timeoutMs = 5000 } = this.#config;
    return { url, method, headers, body, timeoutMs };
  }
}

function request(): RequestBuilder {
  return new RequestBuilder();
}
