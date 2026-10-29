type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';
type RequiredStep = 'url' | 'method';

interface HttpRequest {
  url: string;
  method: Method;
  headers: Record<string, string>;
  body?: string;
  timeoutMs: number;
}

type Missing<Done extends RequiredStep> = Exclude<RequiredStep, Done>;
type BuildArgs<Done extends RequiredStep> = [Missing<Done>] extends [never] ? [] : [missing: `Missing step: ${Missing<Done>}`];
type BodyArg<M extends Method> = [M] extends ['POST' | 'PUT'] ? string : never;

class RequestBuilder<Done extends RequiredStep = never, M extends Method = Method> {
  #config: Partial<HttpRequest>;

  constructor(config: Partial<HttpRequest> = {}) {
    this.#config = config;
  }

  #next<NextDone extends RequiredStep, NextMethod extends Method>(changes: Partial<HttpRequest>): RequestBuilder<NextDone, NextMethod> {
    return new RequestBuilder<NextDone, NextMethod>({ ...this.#config, ...changes });
  }

  url(url: string): RequestBuilder<Done | 'url', M> {
    return this.#next({ url });
  }

  method<N extends Method>(method: N): RequestBuilder<Done | 'method', N> {
    return this.#next({ method });
  }

  header(name: string, value: string): RequestBuilder<Done, M> {
    return this.#next({ headers: { ...this.#config.headers, [name]: value } });
  }

  body(body: BodyArg<M>): RequestBuilder<Done, M> {
    return this.#next({ body });
  }

  timeout(timeoutMs: number): RequestBuilder<Done, M> {
    return this.#next({ timeoutMs });
  }

  build(..._missing: BuildArgs<Done>): HttpRequest {
    const { url, method, headers = {}, body, timeoutMs = 5000 } = this.#config;
    if (url === undefined || method === undefined) {
      throw new Error('url and method are required');
    }
    return body === undefined ? { url, method, headers, timeoutMs } : { url, method, headers, body, timeoutMs };
  }
}

function request(): RequestBuilder {
  return new RequestBuilder();
}
