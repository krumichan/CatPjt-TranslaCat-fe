import createMiddleware from 'next-intl/middleware';
import { withAuth } from "next-auth/middleware";
import {NextRequest, NextResponse} from 'next/server';
import {locales} from "@/i18n/config";
import {isTerminalAuthError} from "@/lib/authError";
import {isPublicDocsPath, PUBLIC_AUTH_PAGES, stripLocalePrefix} from "@/lib/authPolicy";

const publicPages = PUBLIC_AUTH_PAGES;

const intlMiddleware = createMiddleware({
    locales,
    defaultLocale: 'ko',
    // Next 16 applies proxy middleware again to the internal `/ko` rewrite
    // produced by `as-needed`.  The second pass canonicalizes back to the
    // unprefixed URL, which creates an infinite redirect for authenticated
    // Korean routes.  Keep every locale explicit so protected routes are
    // handled in one pass.
    localePrefix: 'always'
});

const authMiddleware = (locale: string) => withAuth(
    (req) => intlMiddleware(req),
    {
        callbacks: {
            authorized: ({ token }) => !!token && !isTerminalAuthError(token.error),
        },
        pages: {
            signIn: `/${locale}/login`,
            error: `/${locale}/error`
        }
    }
);

export default function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // 기존 공개 영문 가이드는 전용 루트를 유지한다. 다른 영어 앱 화면은 아래 인증·locale 경계를 따른다.
    if (pathname.startsWith('/en/') && isPublicDocsPath(pathname)) {
        return NextResponse.next();
    }

    const purePath = stripLocalePrefix(pathname, locales) || '/';

    // 인증 화면은 정확한 경로만, 가이드는 언어별 문서 하위 경로까지 공개한다.
    const isPublic = publicPages.includes(purePath) || isPublicDocsPath(pathname);

    if (isPublic) {
        const response = intlMiddleware(req);
        if (purePath === '/mobile/sign-in') {
            // 앱 승인 화면과 언어 정규화 redirect에만 캐시·referrer·iframe 제한을 적용한다.
            response.headers.set('Cache-Control', 'no-store');
            response.headers.set('Referrer-Policy', 'no-referrer');
            response.headers.set('X-Frame-Options', 'DENY');
            response.headers.set('Content-Security-Policy', "frame-ancestors 'none'");
        }
        return response;
    } else {
        // 인증 판정과 callback URL은 그대로 두고 재로그인 화면도 요청한 표시 언어를 유지한다.
        const segment = pathname.split('/')[1];
        const locale = locales.find((item) => item === segment) ?? 'ko';
        return (authMiddleware(locale) as unknown as (req: NextRequest) => NextResponse)(req);
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
