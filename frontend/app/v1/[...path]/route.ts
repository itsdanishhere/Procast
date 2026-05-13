import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

const hopByHopHeaders = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade"
]);

function backendBaseUrl() {
  if (process.env.PROCAST_API_BASE_URL) {
    return process.env.PROCAST_API_BASE_URL;
  }

  if (process.env.PROCAST_API_HOSTPORT) {
    return `http://${process.env.PROCAST_API_HOSTPORT}`;
  }

  return "http://localhost:4000";
}

function proxyUrl(request: NextRequest, path: string[]) {
  const base = new URL(backendBaseUrl());
  const basePath = base.pathname.replace(/\/$/, "");
  const apiPrefix = basePath.endsWith("/v1") ? basePath : `${basePath}/v1`;
  const target = new URL(`${apiPrefix}/${path.map(encodeURIComponent).join("/")}`, base.origin);
  target.search = request.nextUrl.search;
  return target;
}

function requestHeaders(request: NextRequest) {
  const headers = new Headers(request.headers);

  for (const header of hopByHopHeaders) {
    headers.delete(header);
  }

  headers.delete("host");
  headers.delete("origin");

  const forwardedHost = request.headers.get("host");
  if (forwardedHost) {
    headers.set("x-forwarded-host", forwardedHost);
  }
  headers.set("x-forwarded-proto", request.nextUrl.protocol.replace(":", ""));

  return headers;
}

function responseHeaders(headers: Headers) {
  const output = new Headers(headers);

  for (const header of hopByHopHeaders) {
    output.delete(header);
  }

  output.delete("content-encoding");
  output.delete("content-length");
  output.delete("set-cookie");

  for (const cookie of setCookieHeaders(headers)) {
    output.append("set-cookie", cookie);
  }

  return output;
}

function setCookieHeaders(headers: Headers) {
  const withSetCookie = headers as Headers & { getSetCookie?: () => string[] };
  const explicitCookies = withSetCookie.getSetCookie?.();
  if (explicitCookies?.length) {
    return explicitCookies;
  }

  const combined = headers.get("set-cookie");
  return combined ? combined.split(/,(?=\s*[^;,]+=)/g).map((cookie) => cookie.trim()) : [];
}

async function proxy(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const method = request.method.toUpperCase();
  const init: RequestInit = {
    method,
    headers: requestHeaders(request),
    redirect: "manual",
    cache: "no-store"
  };

  if (method !== "GET" && method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const backendResponse = await fetch(proxyUrl(request, path), init);

  return new Response(backendResponse.body, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
    headers: responseHeaders(backendResponse.headers)
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
