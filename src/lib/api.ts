import { cookies } from "next/headers";

const API_BASE = "https://xyhl-mgrz-aokj.n7c.xano.io/api:58lfyMpE";

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const cookieStore = await cookies();
  const xanoToken = cookieStore.get("xano_token")?.value;

  const headers = new Headers(options.headers);
  if (xanoToken) {
    headers.set("Authorization", `Bearer ${xanoToken}`);
  }
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
}
