"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";

import AuthSessionGuard from "@/components/auth/AuthSessionGuard";

export default function AuthContext({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <SessionProvider>
            <AuthSessionGuard>
                {children}
            </AuthSessionGuard>
        </SessionProvider>
    );
}
