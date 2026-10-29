type Lifetime = 'singleton' | 'transient';

// TODO: add Resolver<Services>, Factory<Services, T> and NewKey<K, Services>

// TODO: make the container generic over a Services map, cache singletons and return a new container from register()
class Container {
  #factories = new Map<string, (resolve: (key: string) => unknown) => unknown>();

  register(key: string, factory: (resolve: (key: string) => unknown) => unknown, options: { lifetime?: Lifetime } = {}): Container {
    this.#factories.set(key, factory);
    return this;
  }

  resolve(key: string): unknown {
    const factory = this.#factories.get(key);
    if (!factory) {
      throw new Error(`Service "${key}" is not registered`);
    }
    return factory((dependency) => this.resolve(dependency));
  }
}

interface Clock {
  now(): number;
}

interface Logger {
  lines: string[];
  info(message: string): void;
}

class SignupService {
  constructor(
    private readonly clock: Clock,
    private readonly logger: Logger,
  ) {}

  signup(email: string): { email: string; createdAt: number } {
    const user = { email, createdAt: this.clock.now() };
    this.logger.info(`signup ${email}`);
    return user;
  }
}

function createContainer() {
  return new Container()
    .register('clock', (): Clock => ({ now: () => Date.now() }))
    .register('logger', (): Logger => {
      const lines: string[] = [];
      return { lines, info: (message) => lines.push(message) };
    })
    // TODO: once resolve is typed, this compiles without casts
    .register('signup', (resolve) => new SignupService(resolve('clock') as Clock, resolve('logger') as Logger), { lifetime: 'transient' });
}
