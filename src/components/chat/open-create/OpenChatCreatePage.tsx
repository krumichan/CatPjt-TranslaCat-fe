"use client";

import { OpenChatCreateView } from "@/components/chat/open-create/OpenChatCreateView";
import { useOpenChatCreate } from "@/hooks/chat/useOpenChatCreate";

export function OpenChatCreatePage() {
    const controller = useOpenChatCreate();

    return <OpenChatCreateView controller={controller} />;
}
