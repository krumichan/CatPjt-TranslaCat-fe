"use client";

import { splitPromptEmphasis, stripPromptMarkup } from "@/features/language-learning/level-test/promptText";

import { Fragment, type ReactNode } from "react";

interface LevelTestPromptTextProps {
    text: string;
    emphasisText?: string | null;
    className?: string;
}

function renderStructuredEmphasis(text: string, emphasisText: string): ReactNode[] {
    const { before, target, after } = splitPromptEmphasis(text, emphasisText);
    if (target === null) return [before];

    return [
        <Fragment key="emphasis-before">{before}</Fragment>,
        <span
            key="emphasis-target"
            data-level-test-emphasis="true"
            className="rounded-sm bg-amber-100/80 px-0.5 underline decoration-2 underline-offset-4 dark:bg-amber-300/15"
        >
            {target}
        </span>,
        <Fragment key="emphasis-after">
            {after}
        </Fragment>,
    ];
}

function renderPromptText(text: string, emphasisText?: string | null): ReactNode[] {
    if (emphasisText?.trim()) {
        return renderStructuredEmphasis(text, emphasisText);
    }
    return [stripPromptMarkup(text)];
}

export function LevelTestPromptText({
    text,
    emphasisText,
    className,
}: LevelTestPromptTextProps) {
    return <p className={className}>{renderPromptText(text, emphasisText)}</p>;
}
