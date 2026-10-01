import type { NextConfig } from "next";
import { CV_BODY_LIMIT } from "./src/app/(dashboard)/perfil/cv-limites";

const nextConfig: NextConfig = {
  logging: {
    serverFunctions: false,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: CV_BODY_LIMIT,
    },
  },
};

export default nextConfig;
