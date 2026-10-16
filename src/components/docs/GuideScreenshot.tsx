import Image from "next/image";
import { Expand } from "lucide-react";
import { ImageZoom } from "fumadocs-ui/components/image-zoom";

interface GuideScreenshotProps {
    src: string;
    alt: string;
    title: string;
    caption: string;
    width: number;
    height: number;
    step: number;
    locale: "ko" | "ja";
}

export function GuideScreenshot({
    src,
    alt,
    title,
    caption,
    width,
    height,
    step,
    locale,
}: GuideScreenshotProps) {
    const isKorean = locale === "ko";
    const isPortrait = height > width;

    // 실제 화면 비율을 유지하고 세로형 화면은 본문 안에서 읽기 좋은 폭으로 제한한다.
    return (
        <figure className={`not-prose my-8 overflow-hidden rounded-2xl border border-fd-border bg-fd-card shadow-sm ${isPortrait ? "mx-auto max-w-md" : ""}`}>
            <div className="flex items-center gap-2.5 border-b border-fd-border px-4 py-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-fd-primary/10 text-xs font-semibold text-fd-primary">
                    {step}
                </span>
                <span className="text-sm font-semibold text-fd-foreground">{title}</span>
                <span className="ml-auto flex shrink-0 items-center gap-1 text-xs text-fd-muted-foreground">
                    <Expand className="size-3.5" aria-hidden="true" />
                    {isKorean ? "확대" : "拡大"}
                </span>
            </div>
            <ImageZoom
                src={src}
                alt={alt}
                caption={caption}
            >
                <Image
                    src={src}
                    alt={alt}
                    width={width}
                    height={height}
                    sizes={isPortrait ? "(max-width: 480px) 100vw, 448px" : "(max-width: 768px) 100vw, 720px"}
                    unoptimized
                    className="block h-auto w-full"
                />
            </ImageZoom>
            <figcaption className="border-t border-fd-border px-4 py-3 text-sm leading-6 text-fd-muted-foreground">
                {caption}
            </figcaption>
        </figure>
    );
}
