type Lifetime = 'singleton' | 'transient';
type Resolver<Services> = <K extends keyof Services>(key: K) => Services[K];
type Factory<Services, T> = (resolve: Resolver<Services>) => T;
type NewKey<K extends string, Services> = K extends keyof Services ? never : K;

interface Registration {
  create: () => unknown;
  lifetime: Lifetime;
  instance?: { value: unknown };
}

class Container<Services extends object = {}> {
  #registrations: Map<string, Registration>;

  constructor(registrations: Map<string, Registration> = new Map()) {
    this.#registrations = registrations;
  }

  register<K extends string, T>(key: NewKey<K, Services>, factory: Factory<Services, T>, options: { lifetime?: Lifetime } = {}): Container<Services & { [P in K]: T }> {
    if (this.#registrations.has(key)) {
      throw new Error(`Service "${key}" is already registered`);
    }
    const registrations = new Map(this.#registrations);
    registrations.set(key, { lifetime: options.lifetime ?? 'singleton', create: () => factory((dependency) => this.resolve(dependency)) });
    return new Container(registrations);
  }

  resolve<K extends keyof Services>(key: K): Services[K] {
    const registration = this.#registrations.get(String(key));
    if (!registration) {
      throw new Error(`Service "${String(key)}" is not registered`);
    }
    if (registration.lifetime === 'transient') {
      return registration.create() as Services[K];
    }
    registration.instance ??= { value: registration.create() };
    return registration.instance.value as Services[K];
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
    .register('signup', (resolve) => new SignupService(resolve('clock'), resolve('logger')), { lifetime: 'transient' });
}
