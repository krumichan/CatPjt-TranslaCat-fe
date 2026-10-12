import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { isTerminalAuthError } from "@/lib/authError";
import { isSameOrigin } from "@/lib/authPolicy";
import { AuthRequestError } from "@/services/authService";

export function authJson(body: unknown, status = 200) {
    return NextResponse.json({ body }, { status, headers: { "Cache-Control": "no-store" } });
}

export function authRouteError(error: unknown) {
    const known = error instanceof AuthRequestError;
    return authJson({
        errorCode: known ? error.code : "AUTH_UNAVAILABLE",
        ...(known && error.retryAfterSeconds ? { retryAfterSeconds: error.retryAfterSeconds } : {}),
    }, known ? error.status : 503);
}

export function requireSameOrigin(request: NextRequest) {
    if (!isSameOrigin(request.headers.get("origin"), process.env.NEXTAUTH_URL ?? request.url)) {
        throw new AuthRequestError("INVALID_REQUEST", 403);
    }
}

export async function readAuthRequest(request: NextRequest): Promise<Record<string, unknown>> {
    if (!request.headers.get("content-type")?.startsWith("application/json")) {
        throw new AuthRequestError("INVALID_REQUEST", 400);
    }
    if (Number(request.headers.get("content-length")) > 12000) {
        throw new AuthRequestError("INVALID_REQUEST", 413);
    }
    // Content-Length가 없거나 잘못돼도 본문을 읽는 동안 실제 바이트 수를 제한한다.
    const reader = request.body?.getReader();
    if (!reader) throw new AuthRequestError("INVALID_REQUEST", 400);
    const decoder = new TextDecoder();
    let text = "";
    let length = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > 12000) {
            await reader.cancel();
            throw new AuthRequestError("INVALID_REQUEST", 413);
        }
        text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    try {
        const body = JSON.parse(text);
        if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
        return body;
    } catch {
        throw new AuthRequestError("INVALID_REQUEST", 400);
    }
}

export async function requireAuthSession() {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken || !session.user.publicId || !session.loginSessionId
        || isTerminalAuthError(session.error)) {
        throw new AuthRequestError("AUTH_REQUIRED", 401);
    }
    return session;
}
