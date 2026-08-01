import {getSession, signOut} from "next-auth/react";

// 웹 브라우저 실행 - CodeBuild 환경 변수 정의가 필요.
// CodeBuild 환경 변수는 Build 단계에서 값이 들어감.
// getSession -> Session 사용으로 웹 브라우저에서 API 송신을 수행함.
// Task Definition 환경 변수는 서버 전용으로 웹 브라우저가 읽을 수 없음.
// 따라서, CodeBuild 환경 변수를 사용해서 Build 단계에 구울 필요가 있음.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const apiClient = async (endpoint: string, options: RequestInit = {}) => {
    const session = await getSession();

    if (!session?.accessToken) {
        console.warn("No token found, redirecting to login...");
        await signOut({ callbackUrl: "/login" });
        return new Response(null, { status: 401 });
    }

    const headers: Record<string, string> = {
        ...options.headers as Record<string, string>,
    };

    if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    (headers as Record<string, string>)["Authorization"] = `Bearer ${session.accessToken}`;

    const apiUrl = `${API_BASE_URL}${endpoint}`;
    const init = {
        ...options,
        headers
    };

    const response = await fetch(apiUrl, init);

    if (response.status === 401) {
        console.error("Authentication error occurred. Logging out...");
        await signOut({ callbackUrl: "/login" });
    }

    return response;
};