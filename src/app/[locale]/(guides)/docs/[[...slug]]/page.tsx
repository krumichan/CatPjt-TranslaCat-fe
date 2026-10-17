import { guideSource } from "@/lib/docs/source";

export { default, generateMetadata } from "@/components/docs/GuidePage";

export function generateStaticParams() {
    // 영문 문서는 앱 표시 언어와 분리된 정적 /en/docs 루트에서 렌더링한다.
    return guideSource.generateParams("slug", "locale").filter((params) => params.locale !== "en");
}