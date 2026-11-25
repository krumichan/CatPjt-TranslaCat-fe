"use client";

import { ImageIcon } from "lucide-react";
import Image from "next/image";

import { usePageProximity, usePageResult, type PageMediaProps } from "@/features/image-translation/useImagePage";

/** 원본의 사적인 열람 주소를 화면에 들어온 미리보기에서 사용한다. */
export function ImagePageThumbnail(props: PageMediaProps) {
    const { ref, near } = usePageProximity(props.page.order < 5);
    const result = usePageResult(props, near, 0);
    const page = result?.page;

    return (
        <figure
            ref={ref}
            className="m-0 flex h-16 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-300"
        >
            {page?.originalURL && page.widthPx && page.heightPx ? (
                <Image
                    src={page.originalURL}
                    alt=""
                    width={page.widthPx}
                    height={page.heightPx}
                    unoptimized
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover object-top"
                />
            ) : <ImageIcon className="size-5" aria-hidden="true" />}
        </figure>
    );
}
