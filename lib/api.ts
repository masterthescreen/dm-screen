"use client";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const res = await fetch(path, {
    method: options.method ?? "GET",
    cache: "no-store",
    credentials: "same-origin",
    headers: options.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    const body = data && typeof data === "object" ? (data as { error?: unknown; code?: unknown }) : {};
    const message = body.error !== undefined ? String(body.error) : `Request failed (${res.status})`;
    // Only a genuinely ended session sends you back to sign-in. Other 401s (like a wrong
    // password) are shown to the user where they happened.
    if (body.code === "not_signed_in" && typeof window !== "undefined" && path !== "/api/me") {
      window.location.assign("/login");
    }
    throw new ApiError(res.status, message);
  }
  return data as T;
}
