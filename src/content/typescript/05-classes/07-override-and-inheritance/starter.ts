class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    // TODO: use new.target.name so subclasses report their own name
    this.name = 'HttpError';
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

  // TODO: this was meant to override describe; fix it with the override keyword and super.describe()
  descibe(): string {
    return `${this.name} ${this.status}: ${this.message} [resource=${this.resource}]`;
  }
}

class ServiceUnavailableError extends HttpError {
  constructor(readonly retryAfterSeconds: number) {
    super(503, 'Service unavailable');
  }

  override isRetryable(): boolean {
    // TODO: reuse super.isRetryable() and require retryAfterSeconds <= 60
    return true;
  }
}
