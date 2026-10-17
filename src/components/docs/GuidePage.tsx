import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/page";
import { Lightbox } from "fumadocs-ui/components/image-zoom";

import { getGuideMDXComponents } from "@/components/docs/mdx";
import { isGuideLocale } from "@/lib/docs/i18n";
import { guideSource } from "@/lib/docs/source";

type GuidePageProps = {
    params: Promise<{ locale: string; slug?: string[] }>;
};


export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
    const { locale, slug } = await params;
    const page = isGuideLocale(locale) ? guideSource.getPage(slug, locale) : undefined;
    if (!page) {
        notFound();
    }

    // 같은 문서의 세 언어 주소를 검색 엔진과 공유 미리보기에 알려준다.
    const suffix = slug?.length ? `/${slug.join("/")}` : "";
    return {
        title: `${page.data.title} | TranslaCat`,
        description: page.data.description,
        alternates: {
            canonical: page.url,
            languages: {
                ko: `/ko/docs${suffix}`,
                ja: `/ja/docs${suffix}`,
                en: `/en/docs${suffix}`,
            },
        },
        openGraph: {
            title: `${page.data.title} | TranslaCat`,
            description: page.data.description,
            url: page.url,
            locale: { ko: "ko_KR", ja: "ja_JP", en: "en_US" }[locale],
            type: "article",
        },
    };
}

export default async function GuidePage({ params }: GuidePageProps) {
    const { locale, slug } = await params;
    if (!isGuideLocale(locale)) {
        notFound();
    }
    // 영문 문서는 next-intl 앱 메시지를 요청하지 않는 독립 루트에서 제공한다.
    if (locale !== "en") {
        setRequestLocale(locale);
    }

    const page = guideSource.getPage(slug, locale);
    if (!page) {
        notFound();
    }

    const Content = page.data.body;

    return (
        <DocsPage toc={page.data.toc}>
            <p className="mb-3 text-xs font-semibold tracking-[0.18em] text-fd-primary">
                TRANSLACAT GUIDE
            </p>
            <DocsTitle>{page.data.title}</DocsTitle>
            <DocsDescription>{page.data.description}</DocsDescription>
            <DocsBody>
                <Lightbox>
                    <Content components={getGuideMDXComponents()} />
                </Lightbox>
            </DocsBody>
        </DocsPage>
    );
}
