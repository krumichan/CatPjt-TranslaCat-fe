"use client";

import type { OpenChatRoomDetail } from "@/types/chat";
import { ArrowRight, Ban, LockKeyhole } from "lucide-react";

export function OpenChatStatusIcon({ reason }: { reason: OpenChatRoomDetail["joinBlockedReason"] }) {
    if (reason === "BANNED") {
        return <Ban className="h-6 w-6" aria-hidden="true" />;
    }
    if (reason === "ROOM_FULL" || reason === "ROOM_CLOSED") {
        return <LockKeyhole className="h-6 w-6" aria-hidden="true" />;
    }
    return <ArrowRight className="h-6 w-6" aria-hidden="true" />;
}
