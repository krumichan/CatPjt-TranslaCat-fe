"use client";

import { useParams } from "next/navigation";
import NovelReaderSmartPage from "@/components/novel/NovelReaderSmartPage";

export default function EpisodeDetailPage() {
    const params = useParams<{ platformCode: string; identifier: string; episodeId: string }>();
    // 소설 진입 권한은 상위 ADMIN layout에서 확인하고 내장 reader를 연결한다.
    return <NovelReaderSmartPage key={`${params.platformCode}:${params.identifier}:${params.episodeId}`} platformCode={params.platformCode} novelIdentifier={params.identifier} episodeIdentifier={params.episodeId} />;
}
