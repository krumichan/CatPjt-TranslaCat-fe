"use client";

import { createElement, type ReactNode } from "react";
import { useLocale } from "next-intl";
import { parseRuby, type RubyNode } from "@/features/common/ruby";

function renderRuby(nodes: RubyNode[]): ReactNode {
    return nodes.map((node, index) => typeof node === "string" ? node
        : createElement(node.tag, { key: index }, node.tag === "br" ? undefined : renderRuby(node.children)));
}

export default function RubyText({ content, className = "" }: { content: string; className?: string }) {
    const locale = useLocale();
    if (!content?.trim()) return <span className={`block min-h-[1.5em] ${className}`} aria-hidden="true" />;

    // 기존 learning 계약은 표시 경계에서만 해석하고 원문 HTML은 실행하지 않는다.
    const separator = locale === "learning" ? content.indexOf("||") : -1;
    if (separator >= 0) {
        return <span className={`flex flex-col gap-1.5 w-full wrap-break-word ${className}`}>
            <span lang="ja" className="whitespace-pre-wrap">{renderRuby(parseRuby(content.slice(0, separator)))}</span>
            <span lang="ko" className="text-[0.85em] text-gray-500 dark:text-zinc-400 border-t pt-1 break-keep">{content.slice(separator + 2)}</span>
        </span>;
    }
    return <span className={`${className} whitespace-pre-wrap ${locale === "ko" ? "break-keep" : "wrap-break-word"}`} lang={locale}>
        {locale === "ja" || locale === "learning" ? renderRuby(parseRuby(content)) : content}
    </span>;
}
