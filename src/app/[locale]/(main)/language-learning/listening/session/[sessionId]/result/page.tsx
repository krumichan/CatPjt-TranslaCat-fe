import { ListeningResultPage } from "@/components/language-learning/listening/result/ListeningResultPage";

export default async function ListeningResultRoutePage({ params }: { params: Promise<{ sessionId: string }> }) {
    const { sessionId } = await params;
    return <ListeningResultPage sessionId={Number(sessionId)} />;
}
