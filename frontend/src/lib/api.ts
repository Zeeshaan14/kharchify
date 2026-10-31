// Thin fetch wrapper around the FastAPI backend. The login JWT lives in localStorage.

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
const TOKEN_KEY = "kharchify.token";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function getToken(): string | null {
  return typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/** FastAPI errors are {"detail": "..."} or a list of validation errors. */
function errorMessage(body: unknown, status: number): string {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) {
    const field = detail[0].loc?.at(-1);
    return field ? `${field}: ${detail[0].msg}` : detail[0].msg;
  }
  return status >= 500 ? "Server error — try again" : `Request failed (${status})`;
}

type Query = Record<string, string | number | boolean | null | undefined>;

export async function api<T>(
  path: string,
  { method = "GET", body, query, form }: { method?: string; body?: unknown; query?: Query; form?: Record<string, string> } = {},
): Promise<T> {
  const url = new URL(API_URL + path);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }

  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload: BodyInit | undefined;
  if (form) payload = new URLSearchParams(form);
  else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetch(url, { method, headers, body: payload });
  } catch {
    throw new ApiError(0, "Can't reach the server — check your connection");
  }

  if (res.status === 401 && path !== "/auth/login") {
    setToken(null);
    // Full reload (not router.push) so no cached data from the old session survives.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    if (typeof window !== "undefined" && window.location.pathname !== "/login") window.location.assign("/login");
  }
  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, errorMessage(data, res.status));
  return data as T;
}

export async function login(email: string, password: string) {
  const { access_token } = await api<{ access_token: string }>("/auth/login", {
    method: "POST",
    form: { username: email, password },
  });
  setToken(access_token);
}

export function logout() {
  setToken(null);
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload clears the query cache
  window.location.assign("/login");
}
