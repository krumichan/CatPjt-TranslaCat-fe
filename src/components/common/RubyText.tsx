"use client";

import {useLocale} from "next-intl";

interface RubyTextProps {
    content: string;
    className?: string;
}

export default function RubyText({ content, className }: RubyTextProps) {
    const locale = useLocale();

    // 1. 데이터가 비어있을 경우 (줄바꿈 처리)
    if (!content || content.trim() === "") {
        // 텍스트가 없어도 높이를 차지하게 하여 줄바꿈 효과를 줌
        return <span className={`block min-h-[1.5em] ${className}`} aria-hidden="true" />;
    }

    // 2. learning 모드 처리
    if (locale === 'learning' && content.includes('||')) {
        const [ja, ko] = content.split('||');
        return (
            <div className={`flex flex-col gap-1.5 w-full break-words ${className}`}
                 lang="ja"
            >
                <span
                    className="text-[#2D2D2D] dark:text-zinc-100 whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{__html: ja}}
                />
                <span
                    className="text-[0.85em] leading-relaxed text-gray-500 dark:text-zinc-400 font-normal border-t border-black/5 dark:border-white/5 pt-1 break-keep"
                    lang="ko"
                >
                    {ko}
                </span>
            </div>
        );
    }

    // 3. 일반 루비 텍스트 및 기본 텍스트 처리
    const hasRuby = locale === "ja" && /<ruby>/.test(content);
    if (hasRuby) {
        return (
            <span
                className={`${className} whitespace-pre-wrap break-words`}
                lang="ja"
                dangerouslySetInnerHTML={{ __html: content }}
            />
        );
    }

    return (
        <span
            className={`${className} ${locale === 'ko' ? 'break-keep' : 'break-words'}`}
            lang={locale}
        >
        {content}
    </span>
    );
}