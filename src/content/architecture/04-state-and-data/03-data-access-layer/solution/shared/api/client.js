export const API_BASE_URL = '/api';

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiGet(path) {
  const response = await fetch(`${API_BASE_URL}${path}`, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    throw new ApiError(response.status, `GET ${path} failed with status ${response.status}`);
  }
  return response.json();
}
