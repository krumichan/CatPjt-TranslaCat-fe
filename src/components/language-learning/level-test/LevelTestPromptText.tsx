"use client";

import { Fragment, type ReactNode } from "react";

interface LevelTestPromptTextProps {
    text: string;
    emphasisText?: string | null;
    className?: string;
}

const HTML_LIKE_TAG_PATTERN = /<\/?[A-Za-z][^>]*>/g;

function stripLegacyMarkup(text: string): string {
    return text.replace(HTML_LIKE_TAG_PATTERN, "");
}

function renderStructuredEmphasis(text: string, emphasisText: string): ReactNode[] {
    const plainText = stripLegacyMarkup(text);
    const target = emphasisText.trim();
    if (!target) return [plainText];

    const index = plainText.indexOf(target);
    if (index < 0) return [plainText];

    return [
        <Fragment key="emphasis-before">{plainText.slice(0, index)}</Fragment>,
        <span
            key="emphasis-target"
            data-level-test-emphasis="true"
            className="rounded-sm bg-amber-100/80 px-0.5 underline decoration-2 underline-offset-4 dark:bg-amber-300/15"
        >
            {target}
        </span>,
        <Fragment key="emphasis-after">
            {plainText.slice(index + target.length)}
        </Fragment>,
    ];
}

function renderPromptText(text: string, emphasisText?: string | null): ReactNode[] {
    if (emphasisText?.trim()) {
        return renderStructuredEmphasis(text, emphasisText);
    }
    return [stripLegacyMarkup(text)];
}

export function LevelTestPromptText({
    text,
    emphasisText,
    className,
}: LevelTestPromptTextProps) {
    return <p className={className}>{renderPromptText(text, emphasisText)}</p>;
}
