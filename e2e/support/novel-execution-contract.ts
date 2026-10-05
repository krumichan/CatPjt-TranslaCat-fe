export type ExpectedExecution = Record<string, string | number | boolean | null>;

export function verifyExecutionContract(expected: ExpectedExecution | undefined, value: unknown) {
    if (!expected || !Object.keys(expected).length) return { verified: false, reason: "NO_EXPECTED_POLICY" };
    if (!value || typeof value !== "object") throw new Error("EXECUTION_CONTRACT_MISMATCH");
    const body = value as Record<string, unknown>;
    const execution = body.execution && typeof body.execution === "object" ? body.execution as Record<string, unknown> : {};
    const actual: ExpectedExecution = {};

    // source DTO와 실행 DTO의 명시된 필드만 정확 비교한다. 누락값을 기본 정책으로 추측하지 않는다.
    for (const [key, target] of Object.entries(expected)) {
        const received = key === "segmentationVersion" ? body.segmentationVersion : execution[key];
        if (received !== target) throw new Error("EXECUTION_CONTRACT_MISMATCH");
        actual[key] = target;
    }
    return { verified: true, expected, actual };
}
