import { PracticeSessionPage } from "@/components/language-learning/practice/PracticeSessionPage";

export default async function VocabularySessionPage({ params }: { params: Promise<{ setId: string }> }) {
    const { setId } = await params;
    return <PracticeSessionPage setId={Number(setId)} expectedDomain="VOCABULARY" />;
}
