import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  output: 'standalone',
  // Live verification launchers use an isolated build directory so an unrelated
  // developer server cannot leave this suite attached to an old process/lock.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  reactCompiler: true,
  redirects() {
    // 이전에 공유한 학습 가이드 URL을 새 작업별 문서 위치로 연결한다.
    const learningPages = [
      "level-test", "writing", "speaking", "listening", "reading", "settings-history",
    ];
    return ["ko", "ja"].flatMap((locale) =>
      learningPages.map((slug) => ({
        source: `/${locale}/docs/learning/${slug}`,
        destination: `/${locale}/docs/language-learning/${slug}`,
        permanent: false,
      })),
    );
  },
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

export default async function configureNext() {
  // ESM 문서 플러그인을 비동기로 불러와 기존 next-intl 설정과 함께 적용한다.
  const { createMDX } = await import("fumadocs-mdx/next");
  const withMDX = createMDX();

  return withMDX(withNextIntl(nextConfig));
}
