export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'member';
}

export type NewUser = Omit<User, 'id'>;

export interface UserRepository {
  findById(id: number): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  list(options?: { limit?: number; offset?: number }): Promise<User[]>;
  create(input: NewUser): Promise<User>;
  update(id: number, patch: Partial<NewUser>): Promise<User | null>;
  delete(id: number): Promise<boolean>;
}

export class DuplicateEmailError extends Error {
  constructor(email: string) {
    super(`Email already in use: ${email}`);
    this.name = 'DuplicateEmailError';
  }
}

export class InMemoryUserRepository implements UserRepository {
  private readonly rows = new Map<number, User>();
  private nextId = 1;

  async findById(id: number): Promise<User | null> {
    const row = this.rows.get(id);
    return row ? { ...row } : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = this.findRowByEmail(email);
    return row ? { ...row } : null;
  }

  async list({ limit = 50, offset = 0 }: { limit?: number; offset?: number } = {}): Promise<User[]> {
    return [...this.rows.values()]
      .sort((first, second) => first.id - second.id)
      .slice(offset, offset + limit)
      .map((row) => ({ ...row }));
  }

  async create(input: NewUser): Promise<User> {
    if (this.findRowByEmail(input.email)) {
      throw new DuplicateEmailError(input.email);
    }
    const row: User = { ...input, id: this.nextId++ };
    this.rows.set(row.id, row);
    return { ...row };
  }

  async update(id: number, patch: Partial<NewUser>): Promise<User | null> {
    const current = this.rows.get(id);
    if (!current) {
      return null;
    }
    const owner = patch.email === undefined ? undefined : this.findRowByEmail(patch.email);
    if (owner && owner.id !== id) {
      throw new DuplicateEmailError(patch.email as string);
    }
    const row: User = { ...current, ...patch, id };
    this.rows.set(id, row);
    return { ...row };
  }

  async delete(id: number): Promise<boolean> {
    return this.rows.delete(id);
  }

  private findRowByEmail(email: string): User | undefined {
    const wanted = email.toLowerCase();
    return [...this.rows.values()].find((row) => row.email.toLowerCase() === wanted);
  }
}

export function createUserService(users: UserRepository) {
  return {
    register(input: { email: string; name: string }): Promise<User> {
      return users.create({ email: input.email.trim().toLowerCase(), name: input.name.trim(), role: 'member' });
    },
    async promoteToAdmin(id: number): Promise<User> {
      const user = await users.update(id, { role: 'admin' });
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    },
  };
}

async function main() {
  const repository = new InMemoryUserRepository();
  const service = createUserService(repository);
  const ada = await service.register({ email: ' Ada@Example.com ', name: 'Ada Lovelace' });
  console.log(await service.promoteToAdmin(ada.id));
  await service.register({ email: 'ada@example.com', name: 'Impostor' }).catch((error) => console.log(error.message));
}

main();
