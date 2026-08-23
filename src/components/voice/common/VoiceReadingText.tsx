"use client";

import type { VoiceReadingTokens } from "@/types/voice";

interface VoiceReadingTextProps {
    text: string;
    tokens: VoiceReadingTokens | null;
    className?: string;
}

function tokenValue(
    token: Record<string, unknown>,
    keys: string[],
): string | null {
    for (const key of keys) {
        const value = token[key];
        if (typeof value === "string" && value.trim()) return value;
    }
    return null;
}

export function VoiceReadingText({
    text,
    tokens,
    className = "",
}: VoiceReadingTextProps) {
    if (!Array.isArray(tokens) || tokens.length === 0) {
        return <span className={className}>{text}</span>;
    }

    const normalized = tokens
        .map((raw) => {
            if (!raw || typeof raw !== "object") return null;
            const token = raw as Record<string, unknown>;
            const surface = tokenValue(token, ["surface", "text", "source"]);
            if (!surface) return null;
            return {
                surface,
                reading: tokenValue(token, ["reading", "ruby"]),
            };
        })
        .filter((token): token is { surface: string; reading: string | null } =>
            Boolean(token),
        );

    if (normalized.length === 0) {
        return <span className={className}>{text}</span>;
    }

    return (
        <span className={className} lang="ja">
            {normalized.map((token, index) =>
                token.reading ? (
                    <ruby key={`${token.surface}-${index}`}>
                        {token.surface}
                        <rp>(</rp>
                        <rt>{token.reading}</rt>
                        <rp>)</rp>
                    </ruby>
                ) : (
                    <span key={`${token.surface}-${index}`}>{token.surface}</span>
                ),
            )}
        </span>
    );
}
