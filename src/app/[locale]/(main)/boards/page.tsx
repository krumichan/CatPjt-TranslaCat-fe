import { Suspense } from "react";

import { BoardSmartPage } from "@/components/board/BoardSmartPage";

export default function BoardsPage() {
    return (
        <Suspense>
            <BoardSmartPage />
        </Suspense>
    );
}
