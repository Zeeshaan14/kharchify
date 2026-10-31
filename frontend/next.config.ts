import type { NextConfig } from "next";

// The app is client-rendered: every page fetches from the FastAPI backend in the browser
// (the login token lives in localStorage), so server caching features (cacheComponents,
// partialPrefetching) don't apply.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
