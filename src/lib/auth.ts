import {NextAuthOptions} from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import {authService} from "@/services/authService";
import {JWT} from "next-auth/jwt";

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    callbacks: {
        async signIn({account}) {
            return !!account?.id_token;
        },
        async jwt({token, user, account}) {
            // 1. 최초 로그인 시 (account와 user가 존재할 때)
            if (account && user) {
                try {
                    // 백엔드와 통신하여 스프링 부트 토큰 가져오기
                    const response = await authService.authenticateWithGoogle(account.id_token!);
                    const { body } = response;

                    token.accessToken = body.accessToken;
                    token.refreshToken = body.refreshToken;
                    token.accessTokenExpires = Date.now() + (body.accessTokenExpiresIn * 1000);
                    token.role = body.role;

                    return token;
                } catch (error) {
                    console.error("Spring Boot Auth Error:", error);
                    return { ...token, error: "AuthError" };
                }
            }

            // 2. 세션 유지 중: 토큰 만료 여부 확인
            const isExpired = Date.now() > ((token.accessTokenExpires as number) - 30 * 1000);

            // 만료 안 됐으면 그대로 반환
            if (!isExpired) return token;

            // 3. 만료됐으면 리프레시 실행 (이제 token.refreshToken이 확실히 존재함)
            return await refreshAccessToken(token);
        },
        async session({session, token}) {
            session.accessToken = token.accessToken;
            session.refreshToken = token.refreshToken;

            session.user.accessToken = token.accessToken;
            session.user.refreshToken = token.refreshToken;
            session.user.accessTokenExpires = token.accessTokenExpires;
            session.user.role = token.role;

            return session;
        },
    },
    pages: {
        signIn: '/login',
        error: '/error',
    },
};

async function refreshAccessToken(token: JWT): Promise<JWT> {
    try {
        if (!token.refreshToken) {
            throw new Error("No refresh token");
        }

        const response = await authService.refreshAccessToken(token.refreshToken);

        const { body } = response;

        return {
            ...token,
            accessToken: body.accessToken,
            refreshToken: body.refreshToken ?? token.refreshToken,
            accessTokenExpires: Date.now() + (body.accessTokenExpiresIn * 1000),
        };
    } catch (error) {
        console.error("Refresh Error: ", error);
        return { ...token, error: "RefreshAccessTokenError" };
    }
}