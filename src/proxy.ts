import createMiddleware from 'next-intl/middleware';
import { withAuth } from "next-auth/middleware";
import {NextRequest, NextResponse} from 'next/server';
import {locales} from "@/i18n/config";
import {isTerminalAuthError} from "@/lib/authError";

const publicPages = ['/login', '/error'];

const intlMiddleware = createMiddleware({
    locales,
    defaultLocale: 'ko',
    localePrefix: 'as-needed'
});

const authMiddleware = withAuth(
    (req) => intlMiddleware(req),
    {
        callbacks: {
            authorized: ({ token }) => !!token && !isTerminalAuthError(token.error),
        },
        pages: {
            signIn: '/login',
            error: '/error'
        }
    }
);

export default function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    const purePath = pathname.replace(new RegExp(`^/(${locales.join('|')})`), '') || '/';

    const isPublic = publicPages.includes(purePath);

    if (isPublic) {
        return intlMiddleware(req);
    } else {
        return (authMiddleware as unknown as (req: NextRequest) => NextResponse)(req);
    }
}

export const config = {
    matcher: [
        /*
         * 아래 경로로 시작하는 요청을 제외한 모든 경로에 미들웨어를 적용합니다:
         * - api (API 라우트)
         * - _next/static (정적 파일)
         * - _next/image (이미지 최적화 파일)
         * - images (퍼블릭 이미지 폴더)
         * - favicon.ico (파비콘)
         * - .svg로 끝나는 파일
         */
        '/((?!api|_next/static|_next/image|images|workers|favicon.ico|.*\\.svg).*)'
    ],
};