import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  images: {
    unoptimized: true,
  },
  turbopack: {
    resolveAlias: {
      "@": path.resolve(__dirname, "src"),
      "@/lib": path.resolve(__dirname, "src/lib"),
      "@/context": path.resolve(__dirname, "src/context"),
      "@/components": path.resolve(__dirname, "src/components"),
    },
  },
  webpack: (config) => {
    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "@": path.resolve(__dirname, "src"),
        "@/lib": path.resolve(__dirname, "src/lib"),
        "@/context": path.resolve(__dirname, "src/context"),
        "@/components": path.resolve(__dirname, "src/components"),
      };
    }
    return config;
  },
};

export default nextConfig;