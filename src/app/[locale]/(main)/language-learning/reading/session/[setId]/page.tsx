import { PracticeSessionPage } from "@/components/language-learning/practice/PracticeSessionPage";

export default async function ReadingSessionPage({ params }: { params: Promise<{ setId: string }> }) {
    const { setId } = await params;
    return <PracticeSessionPage key={`reading:${setId}`} setId={Number(setId)} expectedDomain="READING" />;
}
