// Server 실행 - Task Definition 환경 변수 정의가 필요.
// Task Definition 환경 변수는 서버에서 런타임에 불러와 읽을 수 있음.
// Server 실행이기 때문에 웹 브라우저 환경 변수는 읽을 수 없음.
const SERVER_API_URL = process.env.API_URL;

export class AuthRefreshError extends Error {
    constructor(
        message: string,
        public readonly status?: number,
    ) {
        super(message);
        this.name = "AuthRefreshError";
    }
}

export const authService = {
    async authenticateWithGoogle(idToken: string) {
        const response = await fetch(`${SERVER_API_URL}/auth/social/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
        });

        if (!response.ok) {
            throw new Error("Google authentication failed.");
        }

        return response.json();
    },

    async refreshAccessToken(refreshToken: string) {
        let response: Response;

        try {
            response = await fetch(`${SERVER_API_URL}/auth/token/refresh`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refreshToken }),
            });
        } catch {
            throw new AuthRefreshError(
                "Token refresh service is temporarily unavailable.",
            );
        }

        if (!response.ok) {
            throw new AuthRefreshError(
                "Token refresh failed.",
                response.status,
            );
        }

        return response.json();
    },
};
