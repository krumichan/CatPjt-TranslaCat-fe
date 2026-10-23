import { decode, encode } from "next-auth/jwt";
import type { NextResponse } from "next/server";

import type { GoogleAccountPurpose } from "@/types/auth";

export const GOOGLE_FLOW_COOKIE = "translacat.google-account-flow";
export const GOOGLE_REAUTH_COOKIE = "translacat.google-reauth";
export const DELETION_REAUTH_COOKIE = "translacat.deletion-reauth";

export interface GoogleFlowContext {
    purpose: GoogleAccountPurpose;
    intentToken: string;
    nonce: string;
    publicId: string;
    loginSessionId: string;
    locale: string;
    validUntil: number;
    oauthState?: string;
}

export interface GoogleReauthContext {
    reauthToken: string;
    publicId: string;
    loginSessionId: string;
    validUntil: number;
}

function secret(): string {
    if (!process.env.NEXTAUTH_SECRET) throw new Error("AUTH_CONFIGURATION_REQUIRED");
    return process.env.NEXTAUTH_SECRET;
}

export async function readAuthCookie<T>(name: string, value?: string): Promise<T | null> {
    if (!value) return null;
    try {
        const payload = await decode({ token: value, secret: secret(), salt: name });
        return (payload?.context as T | undefined) ?? null;
    } catch {
        return null;
    }
}

export async function writeAuthCookie(
    response: NextResponse, name: string, context: GoogleFlowContext | GoogleReauthContext, maxAge: number,
) {
    const value = await encode({ secret: secret(), salt: name, token: { context }, maxAge });
    response.cookies.set(name, value, {
        httpOnly: true,
        secure: process.env.NEXTAUTH_URL?.startsWith("https:") ?? process.env.NODE_ENV === "production",
        sameSite: "lax", path: "/", maxAge,
    });
}

export function clearAuthCookie(response: NextResponse, name: string) {
    response.cookies.set(name, "", {
        httpOnly: true, path: "/", maxAge: 0,
        secure: name.startsWith("__Secure-") || name.startsWith("__Host-")
            || (process.env.NEXTAUTH_URL?.startsWith("https:") ?? process.env.NODE_ENV === "production"),
        sameSite: "lax",
    });
}

export function clearGoogleFlow(response: NextResponse) {
    clearAuthCookie(response, GOOGLE_FLOW_COOKIE);
    // 취소 이후 도착한 callback이 일반 로그인으로 바뀌지 않도록 OAuth 증명도 폐기한다.
    for (const prefix of ["", "__Secure-"]) {
        clearAuthCookie(response, `${prefix}next-auth.state`);
        clearAuthCookie(response, `${prefix}next-auth.pkce.code_verifier`);
    }
}
