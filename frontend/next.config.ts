import type { NextConfig } from "next";

const publicApiUrl = process.env.NEXT_PUBLIC_API_URL;
const hasApiProxyTarget = Boolean(process.env.PROCAST_API_BASE_URL?.trim());
const isVercelBuild = process.env.VERCEL === "1";

if (isVercelBuild && !publicApiUrl) {
  throw new Error("NEXT_PUBLIC_API_URL must be set for Vercel deployments. Use /v1 with PROCAST_API_BASE_URL, or set it to the full backend /v1 URL.");
}

if (isVercelBuild && publicApiUrl === "/v1" && !hasApiProxyTarget) {
  throw new Error("PROCAST_API_BASE_URL must be set when NEXT_PUBLIC_API_URL=/v1 so Vercel can proxy API requests to the backend.");
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  output: "standalone"
};

export default nextConfig;
