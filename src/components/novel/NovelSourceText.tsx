import type { ReactNode } from "react";
import type { NovelSegment } from "@/types/novel/reader";

export default function NovelSourceText({ segment }: { segment: NovelSegment }) {
    // 서비스 경계에서 offset/text를 검증한 ruby만 렌더링한다. 원문은 HTML로 해석하지 않는다.
    const content: ReactNode[] = [];
    let offset = 0;
    for (const token of segment.rubyTokens ?? []) {
        content.push(segment.plainJa.slice(offset, token.startOffset));
        content.push(<ruby key={token.startOffset}>{token.text}<rt>{token.reading}</rt></ruby>);
        offset = token.endOffset;
    }
    content.push(segment.plainJa.slice(offset));
    return <span lang="ja">{content}</span>;
}
