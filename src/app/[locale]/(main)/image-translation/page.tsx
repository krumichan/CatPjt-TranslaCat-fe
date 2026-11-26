import { notFound } from "next/navigation";

import { ImageTranslationSession } from "@/components/image-translation/ImageTranslationSession";
import { IMAGE_TRANSLATION_ENABLED, parseImageJobId } from "@/features/image-translation/model";

/** 승인된 배포 환경에서 이미지 번역을 열고 요청된 작업을 소유자 세션에서 복원한다. */
export default async function ImageTranslationPage({
    searchParams,
}: {
    searchParams: Promise<{ job?: string | string[] }>;
}) {
    if (!IMAGE_TRANSLATION_ENABLED) notFound();

    const { job } = await searchParams;
    return <ImageTranslationSession initialJobId={parseImageJobId(job)} />;
}
