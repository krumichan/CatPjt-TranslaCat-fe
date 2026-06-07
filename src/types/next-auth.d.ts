import { DefaultSession } from "next-auth";

export type UserRole = "USER" | "ADMIN";

declare module "next-auth" {
    // session 확장.
    interface Session {
        accessToken?: string;
        refreshToken?: string;
        user: {
            accessToken?: string;
            refreshToken?: string;
            accessTokenExpires?: number;
            role?: UserRole;
        } & DefaultSession["user"];
    }

    interface User {
        accessToken?: string;
        refreshToken?: string;
        accessTokenExpires?: number;
        role?: UserRole;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        accessToken?: string;
        refreshToken?: string;
        accessTokenExpires?: number;
        role?: UserRole;
        error?: string;
    }
}