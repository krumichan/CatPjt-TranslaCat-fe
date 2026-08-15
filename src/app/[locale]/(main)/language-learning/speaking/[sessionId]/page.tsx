import { SpeakingSessionPage } from "@/components/language-learning/speaking/session/SpeakingSessionPage";

export default async function SpeakingSessionRoutePage({
    params,
}: {
    params: Promise<{ sessionId: string }>;
}) {
    const { sessionId } = await params;
    return <SpeakingSessionPage sessionId={Number(sessionId)} />;
}
