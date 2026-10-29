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
  private readonly users = new InMemoryUserRepository();

  // TODO: receive SignupDependencies through the constructor instead of creating the repository above

  async signup(email: string): Promise<User> {
    // TODO: normalize the email, reject taken emails with EmailTakenError, use the injected ids, clock, users and mailer
    const user = { id: randomUUID(), email, createdAt: new Date().toISOString() };
    await this.users.save(user);
    console.log(`Sending "Welcome to Dev Dojo" to ${email}`);
    return user;
  }
}

export function createContainer(overrides: Partial<SignupDependencies> = {}) {
  // TODO: build the default dependencies, apply the overrides and create the SignupService
  return { signupService: new SignupService() };
}

async function main() {
  const { signupService } = createContainer();
  console.log(await signupService.signup('  Ada@Example.com '));
}

main();
