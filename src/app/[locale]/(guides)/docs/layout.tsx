import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { BookOpen, LogIn } from "lucide-react";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider/next";
import { i18nProvider } from "fumadocs-ui/i18n";

import BrandWordmark from "@/components/layout/BrandWordmark";
import { guideTranslations, isGuideLocale } from "@/lib/docs/i18n";
import { guideSource } from "@/lib/docs/source";
import "./guides.css";

export default async function GuideLayout({
    children,
    params,
}: {
    children: ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    if (!isGuideLocale(locale)) {
        notFound();
    }

    const isKorean = locale === "ko";

    // 공개 문서에는 기존 앱 테마를 재사용하고 문서 검색·언어 선택만 추가한다.
    return (
        <RootProvider
            i18n={i18nProvider(guideTranslations, locale)}
            theme={{ enabled: false }}
            search={{ options: { api: "/api/docs/search" } }}
        >
            <DocsLayout
                tree={guideSource.getPageTree(locale)}
                i18n
                nav={{
                    url: `/${locale}/docs`,
                    title: (
                        <span className="flex items-center gap-3">
                            <BrandWordmark className="w-36" alt="TranslaCat" />
                            <span className="rounded-full border border-fd-primary/20 bg-fd-primary/8 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-fd-primary">
                                GUIDE
                            </span>
                        </span>
                    ),
                }}
                links={[
                    {
                        text: isKorean ? "서비스 홈" : "サービスホーム",
                        url: `/${locale}`,
                        active: "none",
                    },
                    {
                        type: "button",
                        text: isKorean ? "로그인" : "ログイン",
                        icon: <LogIn className="size-4" />,
                        url: `/${locale}/login`,
                        active: "none",
                    },
                ]}
                sidebar={{
                    banner: (
                        <div className="mx-2 mb-3 rounded-xl border border-fd-border bg-fd-card px-3 py-3">
                            <p className="flex items-center gap-2 text-sm font-semibold">
                                <BookOpen className="size-4 text-fd-primary" />
                                {isKorean ? "TranslaCat 사용 가이드" : "TranslaCat 使い方ガイド"}
                            </p>
                            <p className="mt-1.5 text-xs leading-5 text-fd-muted-foreground">
                                {isKorean ? "처음 만나는 TranslaCat, 차근차근 함께해요." : "初めてのTranslaCatを、一歩ずつ。"}
                            </p>
                        </div>
                    ),
                }}
                containerProps={{ className: "tc-docs" }}
            >
                {children}
            </DocsLayout>
        </RootProvider>
    );
}
