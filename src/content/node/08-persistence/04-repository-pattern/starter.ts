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
    // TODO: return a copy of the stored user, or null
    return this.rows.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    // TODO: find by email ignoring case and return a copy, or null
    return null;
  }

  async list(options: { limit?: number; offset?: number } = {}): Promise<User[]> {
    // TODO: sort by id, apply offset and limit (defaults 0 and 50) and return copies
    return [...this.rows.values()];
  }

  async create(input: NewUser): Promise<User> {
    // TODO: reject duplicate emails, assign the next id, store the row and return a copy
    const row: User = { ...input, id: this.nextId++ };
    this.rows.set(row.id, row);
    return row;
  }

  async update(id: number, patch: Partial<NewUser>): Promise<User | null> {
    // TODO: merge the patch (keeping the id), reject an email owned by another user, return a copy or null
    return null;
  }

  async delete(id: number): Promise<boolean> {
    // TODO: remove the row and report whether it existed
    return false;
  }
}

export function createUserService(users: UserRepository) {
  return {
    register(input: { email: string; name: string }): Promise<User> {
      // TODO: create a member with a trimmed, lowercase email and a trimmed name
      return users.create({ ...input, role: 'member' });
    },
    async promoteToAdmin(id: number): Promise<User> {
      // TODO: update the role to admin and throw `User not found` when the repository returns null
      return (await users.findById(id)) as User;
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
