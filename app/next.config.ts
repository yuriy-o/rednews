import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The repo root has its own package-lock.json (extension tooling); pin the app as the root.
  turbopack: { root: path.join(__dirname) },
};

export default nextConfig;
