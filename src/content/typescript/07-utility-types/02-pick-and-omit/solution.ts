interface User {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  role: 'admin' | 'member';
}

type PublicUser = Omit<User, 'passwordHash'>;
type UserPreview = Pick<User, 'id' | 'name'>;
type NewUser = Omit<User, 'id' | 'createdAt'>;

function toPublicUser(user: User): PublicUser {
  const { passwordHash, ...publicUser } = user;
  return publicUser;
}

function toPreview(user: User): UserPreview {
  return { id: user.id, name: user.name };
}

function createUser(input: NewUser, id: number, createdAt: Date): User {
  return { ...input, id, createdAt };
}
