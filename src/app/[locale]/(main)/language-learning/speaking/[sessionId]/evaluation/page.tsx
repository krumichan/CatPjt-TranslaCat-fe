import { SpeakingEvaluationPage } from "@/components/language-learning/speaking/evaluation/SpeakingEvaluationPage";

export default async function SpeakingEvaluationRoutePage({
    params,
}: {
    params: Promise<{ sessionId: string }>;
}) {
    const { sessionId } = await params;
    return <SpeakingEvaluationPage sessionId={Number(sessionId)} />;
}
