export const API_BASE_URL = '/api';

export class ApiError extends Error {
  // TODO: accept (status, message), keep the status on the error and set name to 'ApiError'
}

export async function apiGet(path) {
  // TODO: send Accept: application/json and throw an ApiError with the status when the response is not ok
  const response = await fetch(`${API_BASE_URL}${path}`);
  return response.json();
}
