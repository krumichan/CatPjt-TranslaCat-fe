import type { Metadata } from "next";
import { Suspense } from "react";

import AccountDeletionPage from "@/components/auth/AccountDeletionPage";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
    title: "TranslaCat · 계정 탈퇴 및 데이터 삭제", referrer: "no-referrer", robots: { index: false, follow: false },
};

export default function Page() {
    return <Suspense><AccountDeletionPage /></Suspense>;
}
