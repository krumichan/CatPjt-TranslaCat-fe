"use client";

import { SupportView } from "@/components/support/SupportView";
import { useSupportController } from "@/hooks/support/useSupportController";

export function SupportSmartPage() {
    const controller = useSupportController();

    return <SupportView controller={controller} />;
}
