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
    preserveWhitespace = false,
): string | null {
    for (const key of keys) {
        const value = token[key];
        if (typeof value === "string" && (preserveWhitespace ? value.length > 0 : value.trim())) {
            return value;
        }
    }
    return null;
}

export function VoiceReadingText({
    text,
    tokens,
    className = "",
}: VoiceReadingTextProps) {
    const textClassName = className ? `whitespace-pre-wrap ${className}` : "whitespace-pre-wrap";
    if (!Array.isArray(tokens) || tokens.length === 0) {
        return <span className={textClassName}>{text}</span>;
    }

    // 형태소의 공백·줄바꿈도 원문 일부다. 읽기 표기는 글자가 있는 토큰에만 적용한다.
    const normalized = tokens
        .map((raw) => {
            if (!raw || typeof raw !== "object") return null;
            const token = raw as Record<string, unknown>;
            const surface = tokenValue(token, ["surface", "text", "source"], true);
            if (!surface) return null;
            return {
                surface,
                reading: surface.trim() ? tokenValue(token, ["reading", "ruby"]) : null,
            };
        })
        .filter((token): token is { surface: string; reading: string | null } =>
            Boolean(token),
        );

    // 토큰이 원문을 빠짐없이 재구성하지 못하면 원문 전체를 안전하게 표시한다.
    if (normalized.map((token) => token.surface).join("") !== text) {
        return <span className={textClassName}>{text}</span>;
    }

    return (
        <span className={textClassName} lang="ja">
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
