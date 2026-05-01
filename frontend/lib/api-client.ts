import { clearAuthTokens, getAccessToken, storeAuthTokensFromResponse } from "@/lib/auth-session";

export const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/v1";

export function apiUrl(path: string) {
  return `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function buildHeaders(init?: RequestInit, includeAuth = true) {
  const headers = new Headers(init?.headers);

  if (init?.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const accessToken = includeAuth ? getAccessToken() : null;
  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return headers;
}

async function syncAuthState(path: string, response: Response) {
  if (path === "/auth/logout") {
    clearAuthTokens();
    return;
  }

  if (path === "/auth/login" || path === "/auth/signup" || path === "/auth/refresh") {
    await storeAuthTokensFromResponse(response);
  }
}

export async function apiFetch(path: string, init?: RequestInit) {
  const url = apiUrl(path);

  let response = await fetch(url, {
    ...init,
    credentials: "include",
    headers: buildHeaders(init)
  });
  await syncAuthState(path, response);

  if (response.status === 401 && path !== "/auth/login" && path !== "/auth/refresh" && path !== "/auth/logout") {
    const refreshResponse = await fetch(apiUrl("/auth/refresh"), {
      method: "POST",
      credentials: "include",
      headers: buildHeaders({ body: JSON.stringify({}) }, false),
      body: JSON.stringify({})
    });
    await syncAuthState("/auth/refresh", refreshResponse);

    if (refreshResponse.ok) {
      response = await fetch(url, {
        ...init,
        credentials: "include",
        headers: buildHeaders(init)
      });
    } else {
      clearAuthTokens();
    }
  }

  if (response.status === 401) {
    clearAuthTokens();
  }

  return response;
}
