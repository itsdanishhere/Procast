type TokenPair = {
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpiresIn?: number;
  refreshTokenExpiresAt?: string;
};

const accessTokenKey = "procast.accessToken";

let memoryAccessToken: string | null = null;

function hasBrowserStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function getAccessToken() {
  if (memoryAccessToken) return memoryAccessToken;
  if (!hasBrowserStorage()) return null;

  try {
    memoryAccessToken = window.sessionStorage.getItem(accessTokenKey);
  } catch {
    memoryAccessToken = null;
  }
  return memoryAccessToken;
}

export function storeAuthTokens(tokens?: TokenPair | null) {
  if (!tokens?.accessToken) return;

  memoryAccessToken = tokens.accessToken;
  if (hasBrowserStorage()) {
    try {
      window.sessionStorage.setItem(accessTokenKey, tokens.accessToken);
    } catch {
      // The in-memory token still covers the active browser session.
    }
  }
}

export function clearAuthTokens() {
  memoryAccessToken = null;
  if (hasBrowserStorage()) {
    try {
      window.sessionStorage.removeItem(accessTokenKey);
    } catch {
      // Storage may be blocked in hardened browser profiles.
    }
  }
}

export async function storeAuthTokensFromResponse(response: Response) {
  if (!response.ok) return;

  try {
    const data = await response.clone().json();
    storeAuthTokens(data?.tokens);
  } catch {
    // Some auth responses, such as logout, intentionally have no JSON body.
  }
}
