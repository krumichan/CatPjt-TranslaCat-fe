import ChatGuard from "@/components/chat/ChatGuard";
import {ReactNode} from "react";

export default function ChatLayout({ children }: { children: ReactNode }) {
    return (
        <ChatGuard>
            {children}
        </ChatGuard>
    );
}