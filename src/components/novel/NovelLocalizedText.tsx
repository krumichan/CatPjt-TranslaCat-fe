import { createElement, type ReactNode } from "react";
import { parseRuby, type RubyNode } from "@/features/common/ruby";
import { novelDisplayRows, type NovelDisplayRow, type NovelTextValue } from "@/features/novel/localeText";

function renderRuby(nodes: RubyNode[]): ReactNode {
    return nodes.map((node, index) => typeof node === "string" ? node
        : createElement(node.tag, { key: index }, node.tag === "br" ? undefined : renderRuby(node.children)));
}

function JapaneseText({ content }: { content: string }) {
    // Sudachi가 만든 제한된 ruby 구조만 React 요소로 변환한다. 원문 HTML은 실행하지 않는다.
    return <span lang="ja" className="whitespace-pre-wrap wrap-break-word">{renderRuby(parseRuby(content))}</span>;
}

export default function NovelLocalizedText({ value, locale }: { value: NovelTextValue; locale: string }) {
    const rows = novelDisplayRows(value, locale);
    const renderRow = (row: NovelDisplayRow, secondary: boolean) => row.language === "ja"
        ? <JapaneseText key="ja" content={row.content} />
        : <span key="ko" lang="ko" className={`whitespace-pre-wrap break-keep ${secondary ? "text-[0.85em] text-gray-500 dark:text-zinc-400 border-t pt-1" : ""}`}>{row.content}</span>;

    if (rows.length === 1) return renderRow(rows[0], false);
    return <span className="flex flex-col gap-1.5 w-full min-w-0">{rows.map((row, index) => renderRow(row, index > 0))}</span>;
}
