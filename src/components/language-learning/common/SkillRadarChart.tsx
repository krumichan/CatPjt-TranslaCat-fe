"use client";

import { useTranslations } from "next-intl";
import {
    PolarAngleAxis,
    PolarGrid,
    PolarRadiusAxis,
    Radar,
    RadarChart,
    ResponsiveContainer,
} from "recharts";
import type { DotItemDotProps } from "recharts";

import type { SkillScores } from "@/types/language-learning/profile";

interface SkillRadarChartProps {
    scores: SkillScores;
    height?: number;
}

interface RadarMetricData {
    metric: string;
    score: number;
    actualScore: number | null;
}

const SCORE_LABEL_OFFSETS = [
    { dx: 0, dy: -12, textAnchor: "middle" },
    { dx: 10, dy: -4, textAnchor: "start" },
    { dx: 8, dy: 15, textAnchor: "start" },
    { dx: -8, dy: 15, textAnchor: "end" },
    { dx: -10, dy: -4, textAnchor: "end" },
] as const;

function RadarScoreDot({
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

export function SkillRadarChart({
    scores,
    height = 280,
}: SkillRadarChartProps) {
    const t = useTranslations("LanguageLearning.metrics");
    const data: RadarMetricData[] = [
        {
            metric: t("MEANING"),
            score: scores.meaning ?? 0,
            actualScore: scores.meaning,
        },
        {
            metric: t("GRAMMAR"),
            score: scores.grammar ?? 0,
            actualScore: scores.grammar,
        },
        {
            metric: t("VOCABULARY"),
            score: scores.vocabulary ?? 0,
            actualScore: scores.vocabulary,
        },
        {
            metric: t("NATURALNESS"),
            score: scores.naturalness ?? 0,
            actualScore: scores.naturalness,
        },
        {
            metric: t("EXPRESSION"),
            score: scores.expression ?? 0,
            actualScore: scores.expression,
        },
    ];

    const scoreSummary = data
        .filter(({ actualScore }) => actualScore !== null)
        .map(({ metric, actualScore }) => `${metric}: ${actualScore}`)
        .join(", ");

    const hasAnyScore = data.some(({ actualScore }) => actualScore !== null);

    const renderScoreDot = (dotProps: DotItemDotProps) => {
        const actualScore = data[dotProps.index ?? 0]?.actualScore ?? null;

        return (
            <RadarScoreDot
                {...dotProps}
                actualScore={actualScore}
            />
        );
    };

    return (
        <div
            style={{ height }}
            className="relative w-full"
            role="img"
            aria-label={`${t("radarAriaLabel")}. ${scoreSummary}`}
        >
            <div
                aria-hidden="true"
                className="pointer-events-none absolute right-2 top-1 z-10 rounded-full border border-slate-200/80 bg-white/80 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-slate-500 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-400"
            >
                0–100
            </div>

            <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={data} outerRadius="72%">
                    <PolarGrid />
                    <PolarAngleAxis
                        dataKey="metric"
                        tick={{ fontSize: 11 }}
                    />
                    <PolarRadiusAxis
                        domain={[0, 100]}
                        tickCount={6}
                        tick={false}
                        axisLine={false}
                    />
                    <Radar
                        name={t("score")}
                        dataKey="score"
                        fill="currentColor"
                        fillOpacity={hasAnyScore ? 0.18 : 0}
                        stroke="currentColor"
                        strokeOpacity={hasAnyScore ? 1 : 0}
                        className="text-blue-600 dark:text-blue-300"
                        dot={hasAnyScore ? renderScoreDot : false}
                        isAnimationActive={hasAnyScore}
                    />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
}
