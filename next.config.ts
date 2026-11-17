import type { NextConfig } from "next";

// STATIC_EXPORT=1 npm run build → plain HTML files in out/ (only for static previews; Vercel doesn't need it).
const staticExport = !!process.env.STATIC_EXPORT;

const nextConfig: NextConfig = {
  ...(staticExport
    ? { output: "export", trailingSlash: true }
    : { cacheComponents: true, partialPrefetching: true }),
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
