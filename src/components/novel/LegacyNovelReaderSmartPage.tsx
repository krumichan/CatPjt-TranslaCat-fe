"use client";

import { createPortal } from "react-dom";
import { useLegacyNovelReaderController } from "@/hooks/novel/useLegacyNovelReaderController";
import EpisodeHeader from "@/components/episode/EpisodeHeader";
import EpisodeViewer from "@/components/episode/EpisodeViewer";
import ReaderPager from "@/components/reader/ReaderPager";
import OverlayLoader from "@/components/common/OverlayLoader";
import FullPageError from "@/components/common/FullPageError";
import { paths } from "@/utils/pathProvider";

export default function LegacyNovelReaderSmartPage({ platformCode, novelIdentifier, episodeIdentifier }: { platformCode: string; novelIdentifier: string; episodeIdentifier: string }) {
    const c = useLegacyNovelReaderController(platformCode, novelIdentifier, episodeIdentifier);
    if (c.isError) return <FullPageError message="Failed to load episode. Please check your connection." onRetry={() => void c.mutate()} onListPath={paths.novelDetail(platformCode, novelIdentifier)} />;
    return <>
        <div {...c.menu.menuHandlers} style={c.menu.containerStyle} className="min-h-screen w-full bg-white dark:bg-zinc-950 text-[#2D2D2D] dark:text-zinc-200">
            <OverlayLoader isLoading={c.isLoading} size="lg" containerClassName="fixed inset-0 flex items-center justify-center" />
            <div className="flex flex-col items-center">
                {!c.isLoading && c.data && <main className={c.menu.mainClassName}>
                    <EpisodeHeader episodeIdentifier={episodeIdentifier} title={c.data.title} ln={c.ln} />
                    <EpisodeViewer contents={c.data.contents} fontSize={c.fontSize} ln={c.ln} />
                </main>}
            </div>
        </div>
        {!c.isLoading && c.data && c.menu.portalElement && createPortal(<ReaderPager
            prevIdentifier={c.data.pagerInfo?.prevIdentifier ?? null} nextIdentifier={c.data.pagerInfo?.nextIdentifier ?? null}
            isVisible={c.menu.isMenuVisible} onPrev={c.onPrev} onNext={c.onNext} onList={c.onList}
            onRegisterSuccess={c.onRegisterSuccess} fontSize={c.fontSize} setFontSize={c.changeFont} />, c.menu.portalElement)}
    </>;
}
