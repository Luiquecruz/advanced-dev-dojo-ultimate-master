interface ApiError {
  code: number;
  message: string;
}

type ApiResponse<TData = unknown, TError = ApiError> = { ok: true; data: TData } | { ok: false; error: TError };

interface Paginated<TItem, TCursor = number> {
  items: TItem[];
  next: TCursor | null;
}

function success<TData>(data: TData): ApiResponse<TData> {
  return { ok: true, data };
}

function failure<TData = never>(code: number, message: string): ApiResponse<TData> {
  return { ok: false, error: { code, message } };
}

function createCollection<T = string>(...items: T[]): T[] {
  return [...items];
}
