import { DefaultSession } from "next-auth";

declare module "next-auth" {
    // session 확장.
    interface Session {
        accessToken?: string;
        refreshToken?: string;
        user: {
            accessToken?: string;
            refreshToken?: string;
            accessTokenExpires?: number;
        } & DefaultSession["user"];
    }

    interface User {
        accessToken?: string;
        refreshToken?: string;
        accessTokenExpires?: number;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        accessToken?: string;
        refreshToken?: string;
        accessTokenExpires?: number;
        error?: string;
    }
}