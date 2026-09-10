"use client";

import type { DotItemDotProps } from "recharts";

const SCORE_LABEL_OFFSETS = [
    { dx: 0, dy: -12, textAnchor: "middle" },
    { dx: 10, dy: -4, textAnchor: "start" },
    { dx: 8, dy: 15, textAnchor: "start" },
    { dx: -8, dy: 15, textAnchor: "end" },
    { dx: -10, dy: -4, textAnchor: "end" },
] as const;

export function RadarScoreDot({
    cx,
    cy,
    index,
    actualScore,
}: DotItemDotProps & { actualScore: number | null }) {
    if (cx == null || cy == null || actualScore === null) {
        return null;
    }

    const offset = SCORE_LABEL_OFFSETS[index ?? 0] ?? SCORE_LABEL_OFFSETS[0];

    return (
        <g aria-hidden="true">
            <circle
                cx={cx}
                cy={cy}
                r={3}
                fill="currentColor"
                stroke="var(--background)"
                strokeWidth={1.5}
            />
            <text
                x={cx + offset.dx}
                y={cy + offset.dy}
                textAnchor={offset.textAnchor}
                dominantBaseline="middle"
                fill="var(--foreground)"
                fontSize={11}
                fontWeight={700}
            >
                {Math.round(actualScore)}
            </text>
        </g>
    );
}
