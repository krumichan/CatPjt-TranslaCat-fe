import { DefaultSession } from "next-auth";

import type { AuthSessionError } from "@/lib/authError";

export type UserRole = "USER" | "ADMIN";

declare module "next-auth" {
    interface Session {
        accessToken?: string;
        refreshToken?: string;
        error?: AuthSessionError;
        refreshRetryAt?: number;
        user: {
            accessToken?: string;
            refreshToken?: string;
            accessTokenExpires?: number;
            role?: UserRole;
            publicId?: string;
        } & DefaultSession["user"];
    }

    interface User {
        accessToken?: string;
        refreshToken?: string;
        accessTokenExpires?: number;
        role?: UserRole;
        publicId?: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        accessToken?: string;
        refreshToken?: string;
        accessTokenExpires?: number;
        role?: UserRole;
        publicId?: string;
        error?: AuthSessionError;
        refreshRetryAt?: number;
        refreshRetryCount?: number;
    }
}
