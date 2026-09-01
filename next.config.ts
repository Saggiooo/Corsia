import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Il bundle standalone serve all'immagine Docker locale. Su Vercel il
  // relativo adapter gestisce gia' il packaging e, con Next 16.3, la
  // combinazione adapter + standalone non genera next-server.js.nft.json.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  serverExternalPackages: ["@prisma/adapter-pg", "pg"],
};

export default nextConfig;
