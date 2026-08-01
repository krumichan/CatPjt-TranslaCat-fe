import { OpenChatExplorePage } from "@/components/chat/open-explore/OpenChatExplorePage";

interface OpenChatExploreRoutePageProps {
    searchParams: Promise<{
        q?: string | string[];
    }>;
}

export default async function OpenChatExploreRoutePage({
    searchParams,
}: OpenChatExploreRoutePageProps) {
    const { q } = await searchParams;
    const initialKeyword = Array.isArray(q) ? q[0] ?? "" : q ?? "";

    return <OpenChatExplorePage initialKeyword={initialKeyword.slice(0, 100)} />;
}
