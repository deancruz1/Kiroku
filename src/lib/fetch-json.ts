export type ApiResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string };

export const NETWORK_ERROR_MESSAGE =
  "Could not reach the server. Check your connection and try again.";

export async function requestJson(
  url: string,
  init: RequestInit,
  fallbackError: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ApiResult> {
  let res: Response;
  try {
    res = await fetchImpl(url, init);
  } catch {
    return { ok: false, error: NETWORK_ERROR_MESSAGE };
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  const body =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};

  if (!res.ok) {
    return {
      ok: false,
      error:
        typeof body.error === "string" && body.error
          ? body.error
          : fallbackError,
    };
  }
  return { ok: true, data: body };
}

// For query and mutation functions, which report failure by throwing.
export async function responseError(res: Response, fallback: string) {
  try {
    const body = await res.json();
    if (typeof body?.error === "string") return new Error(body.error);
  } catch {
    // Not JSON
  }
  return new Error(fallback);
}
