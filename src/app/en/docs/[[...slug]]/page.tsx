import GuidePage, { generateMetadata as guideMetadata } from "@/components/docs/GuidePage";
import { guideSource } from "@/lib/docs/source";

type EnglishGuideProps = { params: Promise<{ slug?: string[] }> };

export function generateStaticParams() {
    return guideSource.getPages("en").map((page) => ({ slug: page.slugs }));
}

export async function generateMetadata({ params }: EnglishGuideProps) {
    return guideMetadata({ params: Promise.resolve({ locale: "en", ...await params }) });
}

export default async function EnglishGuidePage({ params }: EnglishGuideProps) {
    return <GuidePage params={Promise.resolve({ locale: "en", ...await params })} />;
}
