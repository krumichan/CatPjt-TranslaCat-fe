import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  output: 'standalone',
  // Live verification launchers use an isolated build directory so an unrelated
  // developer server cannot leave this suite attached to an old process/lock.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'authjs.dev', // 구글 로고
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // 구글 프로필 이미지
      },
    ],
  },
};

export default withNextIntl(nextConfig);
