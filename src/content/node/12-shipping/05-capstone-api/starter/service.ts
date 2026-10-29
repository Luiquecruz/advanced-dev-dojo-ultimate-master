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
    // TODO: return the owner's bookmarks, only those containing the tag when one is given
    return [];
  }

  async get(ownerId: string, id: string): Promise<Bookmark> {
    // TODO: return the bookmark, or throw NotFoundError when it is missing or belongs to another owner
    throw new NotFoundError();
  }

  async create(ownerId: string, input: CreateBookmarkInput): Promise<Bookmark> {
    // TODO: throw ConflictError('Bookmark already exists for this URL') for a duplicate url of the same owner, otherwise insert and return the new bookmark
    throw new ConflictError('Not implemented');
  }

  async delete(ownerId: string, id: string): Promise<void> {
    // TODO: delete the bookmark through the same ownership check as get
  }
}
