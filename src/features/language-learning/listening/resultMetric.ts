const LISTENING_RESULT_METRICS = new Set([
    "TOKEN_RECOGNITION",
    "OMISSION_ADDITION_ORDER",
    "ORTHOGRAPHY",
    "MEANING_FIDELITY",
    "DETAIL_AND_NUANCE",
    "ORIGIN_NATURALNESS",
    "PRONUNCIATION",
    "PROSODY_RHYTHM",
    "FLUENCY",
    "COMPLETENESS",
    "ANSWER_ACCURACY",
    "GIST_COVERAGE",
    "KEY_POINT_COVERAGE",
    "LANGUAGE_CLARITY",
]);

export function resolveListeningResultMetric(metric: Record<string, unknown>) {
    const entries = Object.entries(metric);
    const key = String(metric.metric ?? metric.name ?? metric.type ?? entries[0]?.[0] ?? "metric");
    const value = metric.score ?? metric.value
        ?? entries.find(([name, item]) => name !== "confidence" && typeof item === "number")?.[1];
    return { key, value, known: LISTENING_RESULT_METRICS.has(key) };
}
