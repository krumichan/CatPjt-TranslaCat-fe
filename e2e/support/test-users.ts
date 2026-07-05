export type TestUserKey = "A" | "B" | "C";

export interface E2ETestUser {
    key: TestUserKey;
    userId: number;
    publicId: string;
    nickname: string;
    email: string;
}

const env = (name: string, fallback: string): string =>
    process.env[name]?.trim() || fallback;

/**
 * User A: 주 테스트 사용자
 * User B: 친구 요청 수락 및 FRIEND DIRECT 상대
 * User C: FRIEND GROUP 멤버 및 차단 시나리오 상대
 */
export const TEST_USERS: Record<TestUserKey, E2ETestUser> = {
    A: {
        key: "A",
        userId: Number(process.env.E2E_USER_A_ID ?? 101),
        publicId: env("E2E_USER_A_PUBLIC_ID", "TC-H6VR-9KQD"),
        nickname: env("E2E_USER_A_NICKNAME", "E2E User A"),
        email: env("E2E_USER_A_EMAIL", "e2e-user-a@example.com"),
    },
    B: {
        key: "B",
        userId: Number(process.env.E2E_USER_B_ID ?? 102),
        publicId: env("E2E_USER_B_PUBLIC_ID", "TC-PFSN-CLNA"),
        nickname: env("E2E_USER_B_NICKNAME", "E2E User B"),
        email: env("E2E_USER_B_EMAIL", "e2e-user-b@example.com"),
    },
    C: {
        key: "C",
        userId: Number(process.env.E2E_USER_C_ID ?? 103),
        publicId: env("E2E_USER_C_PUBLIC_ID", "TC-3567-W4EZ"),
        nickname: env("E2E_USER_C_NICKNAME", "E2E User C"),
        email: env("E2E_USER_C_EMAIL", "e2e-user-c@example.com"),
    },
};

export const AUTH_STATE_PATHS = {
    A: "playwright/.auth/user-a.json",
    B: "playwright/.auth/user-b.json",
    C: "playwright/.auth/user-c.json",
} as const;
