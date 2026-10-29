import { randomUUID } from 'node:crypto';

export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface UserRepository {
  findByEmail(email: string): Promise<User | undefined>;
  save(user: User): Promise<void>;
}

export interface Mailer {
  send(mail: { to: string; subject: string }): Promise<void>;
}

export interface Clock {
  now(): Date;
}

export type IdGenerator = () => string;

export interface SignupDependencies {
  users: UserRepository;
  mailer: Mailer;
  clock: Clock;
  ids: IdGenerator;
}

export class EmailTakenError extends Error {
  constructor(email: string) {
    super(`Email already registered: ${email}`);
    this.name = 'EmailTakenError';
  }
}

export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();

  async findByEmail(email: string): Promise<User | undefined> {
    return this.users.get(email);
  }

  async save(user: User): Promise<void> {
    this.users.set(user.email, user);
  }
}

export const systemClock: Clock = { now: () => new Date() };

export const consoleMailer: Mailer = {
  async send(mail) {
    console.log(`Sending "${mail.subject}" to ${mail.to}`);
  },
};

export class SignupService {
  constructor(private readonly deps: SignupDependencies) {}

  async signup(rawEmail: string): Promise<User> {
    const email = rawEmail.trim().toLowerCase();
    if (await this.deps.users.findByEmail(email)) {
      throw new EmailTakenError(email);
    }
    const user: User = { id: this.deps.ids(), email, createdAt: this.deps.clock.now().toISOString() };
    await this.deps.users.save(user);
    await this.deps.mailer.send({ to: email, subject: 'Welcome to Dev Dojo' });
    return user;
  }
}

export function createContainer(overrides: Partial<SignupDependencies> = {}) {
  const deps: SignupDependencies = {
    users: new InMemoryUserRepository(),
    mailer: consoleMailer,
    clock: systemClock,
    ids: randomUUID,
    ...overrides,
  };
  return { ...deps, signupService: new SignupService(deps) };
}

async function main() {
  const { signupService } = createContainer();
  console.log(await signupService.signup('  Ada@Example.com '));
}

main();
