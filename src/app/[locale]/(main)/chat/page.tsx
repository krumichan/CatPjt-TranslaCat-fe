import { ChatHubPage } from "@/components/chat/hub/ChatHubPage";
import { normalizeChatHubTab } from "@/components/chat/hub/chatHubTabConfig";

interface ChatRoutePageProps {
    searchParams: Promise<{
        tab?: string | string[];
    }>;
}

export default async function ChatRoutePage({
    searchParams,
}: ChatRoutePageProps) {
    const { tab } = await searchParams;

    return (
        <ChatHubPage
            initialTab={normalizeChatHubTab(tab)}
        />
    );
}
