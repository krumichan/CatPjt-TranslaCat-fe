"use client";

import NovelReaderView from "@/components/novel/NovelReaderView";
import { useNovelReaderController } from "@/hooks/novel/useNovelReaderController";

export default function NovelReaderSmartPage({ platformCode, novelIdentifier, episodeIdentifier }: { platformCode: string; novelIdentifier: string; episodeIdentifier: string }) {
    const controller = useNovelReaderController(platformCode, novelIdentifier, episodeIdentifier);
    return <NovelReaderView controller={controller} />;
}
