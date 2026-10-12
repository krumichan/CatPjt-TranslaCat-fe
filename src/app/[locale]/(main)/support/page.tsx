import { Suspense } from "react";

import { SupportSmartPage } from "@/components/support/SupportSmartPage";

export default function SupportPage() {
    return (
        <Suspense>
            <SupportSmartPage />
        </Suspense>
    );
}
