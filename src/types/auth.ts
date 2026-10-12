import type { UserRole } from "@/types/next-auth";

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresIn: number;
    role: UserRole;
    publicId: string;
}

export interface EmailChallenge {
    challengeId: string;
    expiresIn: number;
    resendAfterSeconds: number;
}

export interface EmailVerification {
    verificationToken: string;
    expiresIn: number;
}

export interface AccountAuthentication {
    email: string;
    hasPassword: boolean;
    googleLinked: boolean;
    birthDate: string | null;
    reauthenticated?: boolean;
}

export type GoogleAccountPurpose = "LINK" | "REAUTHENTICATE";

export interface GoogleAccountIntent {
    intentToken: string;
    nonce: string;
    expiresIn: number;
}
