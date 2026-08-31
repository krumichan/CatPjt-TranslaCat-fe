import { LevelTestSessionSmartPage } from "@/components/language-learning/level-test/LevelTestSessionSmartPage";

interface LevelTestSessionPageProps {
    sessionId: number;
}

export function LevelTestSessionPage({ sessionId }: LevelTestSessionPageProps) {
    return <LevelTestSessionSmartPage sessionId={sessionId} />;
}
