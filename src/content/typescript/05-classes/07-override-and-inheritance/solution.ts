class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }

  isRetryable(): boolean {
    return this.status >= 500;
  }

  describe(): string {
    return `${this.name} ${this.status}: ${this.message}`;
  }
}

class NotFoundError extends HttpError {
  constructor(readonly resource: string) {
    super(404, `${resource} not found`);
  }

  override describe(): string {
    return `${super.describe()} [resource=${this.resource}]`;
  }
}

class ServiceUnavailableError extends HttpError {
  constructor(readonly retryAfterSeconds: number) {
    super(503, 'Service unavailable');
  }

  override isRetryable(): boolean {
    return super.isRetryable() && this.retryAfterSeconds <= 60;
  }
}
