"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import { usePathname } from "next/navigation";

import AuthSessionGuard from "@/components/auth/AuthSessionGuard";
import { isPublicDocsPath } from "@/lib/authPolicy";

export default function AuthContext({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    // 가이드는 세션 조회나 만료 세션의 로그아웃 처리 없이 읽을 수 있어야 한다.
    // 앱으로 이동하면 기존 인증 공급자와 guard가 다시 함께 마운트된다.
    if (isPublicDocsPath(pathname)) {
        return children;
    }

    return (
        <SessionProvider>
            <AuthSessionGuard>
                {children}
            </AuthSessionGuard>
        </SessionProvider>
    );
}
