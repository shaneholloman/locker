import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@openstore/common",
    "@openstore/database",
    "@openstore/email",
    "@openstore/storage",
  ],
  serverExternalPackages: ["re2"],
};

export default nextConfig;
