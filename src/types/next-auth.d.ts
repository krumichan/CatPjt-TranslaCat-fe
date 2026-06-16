import { DefaultSession } from "next-auth";

export type UserRole = "USER" | "ADMIN";

declare module "next-auth" {
    interface Session {
        accessToken?: string;
        refreshToken?: string;
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
        error?: string;
    }
}