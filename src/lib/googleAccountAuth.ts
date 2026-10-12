import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import {
    clearGoogleFlow, GOOGLE_FLOW_COOKIE, GOOGLE_REAUTH_COOKIE,
    readAuthCookie, writeAuthCookie,
} from "@/lib/authFlowCookies";
import type { GoogleFlowContext, GoogleReauthContext } from "@/lib/authFlowCookies";
import { sameAuthSession } from "@/lib/authPolicy";
import { requireAuthSession } from "@/lib/authRouteHelpers";
import { AuthRequestError, requestServerAuth } from "@/services/authService";

type RouteContext = { params: Promise<{ nextauth: string[] }> };

function accountUrl(request: NextRequest, flow: GoogleFlowContext | null, result: string) {
    const locale = flow && ["ko", "ja", "learning"].includes(flow.locale) ? flow.locale : "ko";
    return new URL(`/${locale}/settings/account?google=${encodeURIComponent(result)}`, process.env.NEXTAUTH_URL ?? request.url);
}

export async function handleAuthentication(request: NextRequest, context: RouteContext) {
    const [action, provider] = (await context.params).nextauth;
    const rawFlow = request.cookies.get(GOOGLE_FLOW_COOKIE)?.value;
    if (provider !== "google" || !["signin", "callback"].includes(action) || !rawFlow) {
        return NextAuth(authOptions)(request, context);
    }

    // 링크 의도는 암호화 쿠키와 현재 로그인 세션으로 확인한다. 만료 시 일반 로그인으로 넘어가지 않는다.
    const flow = await readAuthCookie<GoogleFlowContext>(GOOGLE_FLOW_COOKIE, rawFlow);
    let session;
    try {
        session = await requireAuthSession();
    } catch {
        session = null;
    }
    if (!flow || flow.validUntil <= Date.now() || !sameAuthSession(flow, session)
        || (action === "callback" && (!flow.oauthState || flow.oauthState !== request.nextUrl.searchParams.get("state")))) {
        const response = NextResponse.redirect(accountUrl(request, flow, "GOOGLE_FLOW_EXPIRED"));
        clearGoogleFlow(response);
        return response;
    }

    let completed = false;
    let failure = "GOOGLE_FLOW_FAILED";
    let reauth: GoogleReauthContext | undefined;
    const options: NextAuthOptions = {
        ...authOptions,
        providers: [
            GoogleProvider({
                clientId: process.env.GOOGLE_CLIENT_ID!,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
                authorization: { params: { scope: "openid email profile", nonce: flow.nonce, prompt: "select_account" } },
                // NextAuth의 state/PKCE 검증을 유지하고 BE가 발급한 nonce도 검증한다.
                token: {
                    async request({ client, params, checks, provider: oauthProvider }) {
                        const tokens = await client.callback(oauthProvider.callbackUrl, params, { ...checks, nonce: flow.nonce });
                        return { tokens };
                    },
                },
            }),
            ...authOptions.providers.filter((item) => item.id !== "google"),
        ],
        callbacks: {
            ...authOptions.callbacks,
            async signIn({ account }) {
                if (!account?.id_token || account.provider !== "google") return false;
                try {
                    const result = await requestServerAuth<{ linked?: boolean; reauthToken?: string; expiresIn?: number }>(
                        "/auth/account/google/complete",
                        { intentToken: flow.intentToken, idToken: account.id_token }, session!.accessToken,
                    );
                    if (flow.purpose === "REAUTHENTICATE") {
                        if (!result.body.reauthToken || !result.body.expiresIn) throw new AuthRequestError("GOOGLE_FLOW_FAILED", 502);
                        reauth = {
                            reauthToken: result.body.reauthToken,
                            publicId: flow.publicId, loginSessionId: flow.loginSessionId,
                            validUntil: Date.now() + Math.min(result.body.expiresIn, 300) * 1000,
                        };
                    } else if (!result.body.linked) {
                        throw new AuthRequestError("GOOGLE_FLOW_FAILED", 502);
                    }
                    completed = true;
                    // URL 반환은 NextAuth JWT 발급 전에 종료되어 원래 로그인 세션이 유지된다.
                    return accountUrl(request, flow, flow.purpose === "LINK" ? "linked" : "reauthenticated").toString();
                } catch (error) {
                    failure = error instanceof AuthRequestError ? error.code : "GOOGLE_FLOW_FAILED";
                    return accountUrl(request, flow, failure).toString();
                }
            },
        },
    };

    const result: Response = await NextAuth(options)(request, context);
    const response = new NextResponse(result.body, { status: result.status, headers: result.headers });
    if (action === "signin") {
        // 실제 OAuth state를 연결 시도에 묶어 다른 탭이나 이전 callback을 거부한다.
        const data = await response.clone().json().catch(() => null);
        const url = data?.url ?? response.headers.get("location");
        const state = typeof url === "string" ? new URL(url, request.url).searchParams.get("state") : null;
        if (state) {
            await writeAuthCookie(response, GOOGLE_FLOW_COOKIE, { ...flow, oauthState: state }, 900);
        } else {
            clearGoogleFlow(response);
        }
        return response;
    }

    clearGoogleFlow(response);
    if (completed && reauth) {
        await writeAuthCookie(response, GOOGLE_REAUTH_COOKIE, reauth, 300);
    }
    // 사용자가 Google에서 취소하거나 OAuth 검증이 실패한 경우에도 설정으로 복귀한다.
    response.headers.set("location", accountUrl(request, flow, completed
        ? flow.purpose === "LINK" ? "linked" : "reauthenticated"
        : failure).toString());
    return response;
}
