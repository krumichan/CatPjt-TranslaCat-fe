import { ListeningSessionPage } from "@/components/language-learning/listening/session/ListeningSessionPage";

export default async function ListeningSessionRoutePage({ params }: { params: Promise<{ sessionId: string }> }) {
    const { sessionId } = await params;
    return <ListeningSessionPage sessionId={Number(sessionId)} />;
}
