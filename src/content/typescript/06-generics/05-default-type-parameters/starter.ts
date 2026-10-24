interface ApiError {
  code: number;
  message: string;
}

// TODO: default TData to unknown and TError to ApiError
type ApiResponse<TData, TError> = { ok: true; data: TData } | { ok: false; error: TError };

// TODO: default TCursor to number
interface Paginated<TItem, TCursor> {
  items: TItem[];
  next: TCursor | null;
}

function success<TData>(data: TData): ApiResponse<TData, ApiError> {
  return { ok: true, data };
}

// TODO: default TData to never and build the error object
function failure<TData>(code: number, message: string): ApiResponse<TData, ApiError> {
  return { ok: false, error: { code: 0, message: '' } };
}

// TODO: default T to string
function createCollection<T>(...items: T[]): T[] {
  return [...items];
}
