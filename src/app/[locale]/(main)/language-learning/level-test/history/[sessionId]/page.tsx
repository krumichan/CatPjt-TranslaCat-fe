import { LevelTestHistoryDetailSmartPage } from "@/components/language-learning/level-test/LevelTestHistoryDetailSmartPage";

export default async function LevelTestHistoryDetailRoutePage({
    params,
}: {
    params: Promise<{ sessionId: string }>;
}) {
    const { sessionId } = await params;
    return <LevelTestHistoryDetailSmartPage sessionId={Number(sessionId)} />;
}
