export interface Bookmark {
  id: string;
  ownerId: string;
  url: string;
  title: string;
  tags: string[];
  createdAt: string;
}

export interface BookmarkRepository {
  listByOwner(ownerId: string): Promise<Bookmark[]>;
  findById(id: string): Promise<Bookmark | undefined>;
  findByOwnerAndUrl(ownerId: string, url: string): Promise<Bookmark | undefined>;
  insert(bookmark: Bookmark): Promise<void>;
  delete(id: string): Promise<void>;
}

export class InMemoryBookmarkRepository implements BookmarkRepository {
  private readonly bookmarks = new Map<string, Bookmark>();

  async listByOwner(ownerId: string): Promise<Bookmark[]> {
    return [...this.bookmarks.values()].filter((bookmark) => bookmark.ownerId === ownerId).map((bookmark) => structuredClone(bookmark));
  }

  async findById(id: string): Promise<Bookmark | undefined> {
    const bookmark = this.bookmarks.get(id);
    return bookmark && structuredClone(bookmark);
  }

  async findByOwnerAndUrl(ownerId: string, url: string): Promise<Bookmark | undefined> {
    const bookmark = [...this.bookmarks.values()].find((current) => current.ownerId === ownerId && current.url === url);
    return bookmark && structuredClone(bookmark);
  }

  async insert(bookmark: Bookmark): Promise<void> {
    this.bookmarks.set(bookmark.id, structuredClone(bookmark));
  }

  async delete(id: string): Promise<void> {
    this.bookmarks.delete(id);
  }
}
