import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

// 이전에 공개한 가이드 세부 경로만 예약한다. 이 목록은 신규 가이드 추가 시 확장하지 않는다.
const legacyGuidePaths = [
    "account-books",
    "account-books/create",
    "account-books/fixed-costs",
    "account-books/goals-statistics",
    "account-books/manual-transactions",
    "account-books/open",
    "account-books/receipt-review",
    "account-books/receipt-upload",
    "account-books/sharing",
    "account-books/spending-analysis",
    "account-books/transactions",
    "chat",
    "chat/ai-members",
    "chat/direct-groups",
    "chat/friends",
    "chat/messages-translation",
    "chat/open",
    "chat/open-rooms",
    "chat/report",
    "chat/room-management",
    "english-support",
    "getting-started",
    "language-learning",
    "language-learning/english",
    "language-learning/history",
    "language-learning/keywords",
    "language-learning/level-test",
    "language-learning/listening",
    "language-learning/reading",
    "language-learning/settings-history",
    "language-learning/speaking",
    "language-learning/web-ai",
    "language-learning/writing",
    "novel",
    "novel/explore",
    "novel/read-listen",
    "settings",
    "settings/account-deletion",
    "settings/account-login",
    "settings/appearance",
    "settings/chat-defaults",
    "settings/images",
    "settings/open",
    "settings/profile",
    "support",
    "support/inquiries",
    "support/messages",
    "support/notices",
    "support/open",
    "support/replies",
    "voice",
    "voice/history",
    "voice/input-modes",
    "voice/languages-storage",
    "voice/live-translation",
    "voice/open",
];

const legacyLearningPaths = ["level-test", "writing", "speaking", "listening", "reading", "settings-history"];

const nextConfig: NextConfig = {
    output: 'standalone',
    // Live verification launchers use an isolated build directory so an unrelated
    // developer server cannot leave this suite attached to an old process/lock.
    distDir: process.env.NEXT_DIST_DIR ?? '.next',
    reactCompiler: true,
    /** 기존 세부 가이드와 언어 접두사가 없는 가이드 URL을 새 위치로 연결한다. */
    redirects() {
        // /docs 루트와 설계 문서 경로에 영향을 주지 않도록 공개했던 주소만 매칭한다.
        const legacyGuides = ["ko", "ja", "en"].flatMap((locale) =>
            legacyGuidePaths.map((slug) => ({
                source: `/${locale}/docs/${slug}`,
                destination: `/${locale}/guides/${slug}`,
                permanent: false,
            })),
        );

        // 이미 공유된 학습 별칭은 중간 URL을 거치지 않고 최종 문서로 직접 연결한다.
        const learningAliases = ["ko", "ja"].flatMap((locale) =>
            legacyLearningPaths.map((slug) => ({
                source: `/${locale}/docs/learning/${slug}`,
                destination: `/${locale}/guides/language-learning/${slug}`,
                permanent: false,
            })),
        );

        return [
            { source: "/guides/:path*", destination: "/ko/guides/:path*", permanent: false },
            ...legacyGuides,
            ...learningAliases,
        ];
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
