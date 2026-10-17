import type { NextRequest } from "next/server";

import { authJson, authRouteError, readAuthRequest, requireAuthSession, requireSameOrigin } from "@/lib/authRouteHelpers";
import {
    clearAuthCookie, clearGoogleFlow, GOOGLE_FLOW_COOKIE, GOOGLE_REAUTH_COOKIE,
    readAuthCookie, writeAuthCookie,
} from "@/lib/authFlowCookies";
import type { GoogleReauthContext } from "@/lib/authFlowCookies";
import { sameAuthSession } from "@/lib/authPolicy";
import { AuthRequestError, requestServerAuth } from "@/services/authService";
import type { AccountAuthentication, GoogleAccountIntent } from "@/types/auth";
import { locales } from "@/i18n/config";

type Context = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, context: Context) {
    try {
        if ((await context.params).path.join("/") !== "details") throw new AuthRequestError("INVALID_REQUEST", 404);
        const session = await requireAuthSession();
        const result = await requestServerAuth<AccountAuthentication>("/auth/account", undefined, session.accessToken, "GET");
        const reauth = await readAuthCookie<GoogleReauthContext>(GOOGLE_REAUTH_COOKIE, request.cookies.get(GOOGLE_REAUTH_COOKIE)?.value);
        return authJson({
            ...result.body,
            reauthenticated: !!reauth && reauth.validUntil > Date.now() && sameAuthSession(reauth, session),
        });
    } catch (error) {
        return authRouteError(error);
    }
}

export async function POST(request: NextRequest, context: Context) {
    try {
        requireSameOrigin(request);
        const path = (await context.params).path.join("/");

        // 일반 Google 로그인 시작 전에도 이전 연결 시도를 취소할 수 있다.
        if (path === "google/cancel") {
            const response = authJson({ canceled: true });
            clearGoogleFlow(response);
            clearAuthCookie(response, GOOGLE_REAUTH_COOKIE);
            return response;
        }

        const session = await requireAuthSession();
        const body = await readAuthRequest(request);
        if (path === "google/start") {
            if (body.purpose !== "LINK" && body.purpose !== "REAUTHENTICATE") throw new AuthRequestError("INVALID_REQUEST", 400);
            const result = await requestServerAuth<GoogleAccountIntent>("/auth/account/google/start", {
                purpose: body.purpose, currentPassword: body.currentPassword,
            }, session.accessToken);
            const locale = locales.some((item) => item === body.locale) ? String(body.locale) : "ko";
            const response = authJson({ started: true });
            clearGoogleFlow(response);
            clearAuthCookie(response, GOOGLE_REAUTH_COOKIE);
            // 실제 권한은 5분 이내다. OAuth 유효기간 동안 만료 표식을 보존하여 늦은 callback도 차단한다.
            await writeAuthCookie(response, GOOGLE_FLOW_COOKIE, {
                ...result.body, purpose: body.purpose, locale,
                publicId: session.user.publicId!, loginSessionId: session.loginSessionId!,
                validUntil: Date.now() + Math.min(result.body.expiresIn, 300) * 1000,
            }, 900);
            return response;
        }

        if (path === "email/challenges") {
            const result = await requestServerAuth("/auth/account/email/challenges", {}, session.accessToken);
            return authJson(result.body);
        }

        if (path === "password") {
            const reauth = await readAuthCookie<GoogleReauthContext>(GOOGLE_REAUTH_COOKIE, request.cookies.get(GOOGLE_REAUTH_COOKIE)?.value);
            if (!reauth || reauth.validUntil <= Date.now() || !sameAuthSession(reauth, session)) {
                throw new AuthRequestError("REAUTHENTICATION_REQUIRED", 403);
            }
            const result = await requestServerAuth("/auth/account/password", {
                password: body.password, verificationToken: body.verificationToken,
                reauthToken: reauth.reauthToken,
            }, session.accessToken);
            const response = authJson(result.body);
            clearAuthCookie(response, GOOGLE_REAUTH_COOKIE);
            return response;
        }
        throw new AuthRequestError("INVALID_REQUEST", 404);
    } catch (error) {
        return authRouteError(error);
    }
}
