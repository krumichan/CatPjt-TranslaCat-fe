import { LevelTestSessionPage } from "@/components/language-learning/level-test/LevelTestSessionPage";

export default async function LevelTestSessionRoutePage({
    params,
}: {
    params: Promise<{ sessionId: string }>;
}) {
    const { sessionId } = await params;
    return <LevelTestSessionPage sessionId={Number(sessionId)} />;
}
