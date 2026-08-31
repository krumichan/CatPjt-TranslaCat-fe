import { LevelTestResultSmartPage } from "@/components/language-learning/level-test/LevelTestResultSmartPage";

export default async function LevelTestResultRoutePage({
    params,
}: {
    params: Promise<{ sessionId: string }>;
}) {
    const { sessionId } = await params;
    return <LevelTestResultSmartPage sessionId={Number(sessionId)} />;
}
