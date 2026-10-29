import { ConflictError, NotFoundError } from './errors';
import type { Bookmark, BookmarkRepository } from './repository';
import type { CreateBookmarkInput } from './schemas';

export interface ServiceDependencies {
  repository: BookmarkRepository;
  ids: () => string;
  now: () => Date;
}

export class BookmarkService {
  constructor(private readonly deps: ServiceDependencies) {}

  async list(ownerId: string, tag?: string): Promise<Bookmark[]> {
    const bookmarks = await this.deps.repository.listByOwner(ownerId);
    return tag ? bookmarks.filter((bookmark) => bookmark.tags.includes(tag.toLowerCase())) : bookmarks;
  }

  async get(ownerId: string, id: string): Promise<Bookmark> {
    const bookmark = await this.deps.repository.findById(id);
    if (!bookmark || bookmark.ownerId !== ownerId) {
      throw new NotFoundError();
    }
    return bookmark;
  }

  async create(ownerId: string, input: CreateBookmarkInput): Promise<Bookmark> {
    if (await this.deps.repository.findByOwnerAndUrl(ownerId, input.url)) {
      throw new ConflictError('Bookmark already exists for this URL');
    }
    const bookmark: Bookmark = { id: this.deps.ids(), ownerId, ...input, createdAt: this.deps.now().toISOString() };
    await this.deps.repository.insert(bookmark);
    return bookmark;
  }

  async delete(ownerId: string, id: string): Promise<void> {
    await this.get(ownerId, id);
    await this.deps.repository.delete(id);
  }
}
