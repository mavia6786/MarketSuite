/**
 * Minimal fetch-based API client for the shared management backend.
 *
 * The existing backend does NOT use a { success, data } envelope: errors are `{ message, code }`
 * and health is `{ status: 'ok' }`. This client accepts both that style and a `{ data }` wrapper,
 * so it works with the private API style and with the public `{ data }` routes.
 */
const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || '/api';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

interface ErrorShape {
  message?: unknown;
  code?: unknown;
  error?: { message?: unknown; code?: unknown };
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { Accept: 'application/json', ...(init.headers ?? {}) },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the store server.');
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const e = (body && typeof body === 'object' ? body : {}) as ErrorShape;
    const message = e.message ?? e.error?.message;
    const code = e.code ?? e.error?.code;
    throw new ApiError(
      response.status,
      typeof code === 'string' ? code : 'UNKNOWN_ERROR',
      typeof message === 'string' ? message : 'Unexpected response from the server.',
    );
  }

  if (body && typeof body === 'object' && 'data' in body) return (body as { data: T }).data;
  return body as T;
}
