import { expect, type APIRequestContext } from "@playwright/test";

export type ReceiptRuntimeIdentity = {
    runId: string;
    sourceFingerprint: string;
    startedAt: string;
    processId: number;
    workingDirectory: string;
    commandFingerprint: string;
    gitHead: string | null;
    providerCallCount: number;
};

export async function assertReceiptRuntimePreflight(
    api: APIRequestContext,
    accountBookId: number | string,
    authorization: string,
): Promise<ReceiptRuntimeIdentity> {
    const expectedRunId = process.env.E2E_RECEIPT_EXPECTED_RUN_ID;
    const expectedFingerprint = process.env.E2E_RECEIPT_EXPECTED_SOURCE_FINGERPRINT;
    expect(expectedRunId, "E2E_RECEIPT_EXPECTED_RUN_ID is required for LIVE receipt tests.").toBeTruthy();
    expect(expectedFingerprint, "E2E_RECEIPT_EXPECTED_SOURCE_FINGERPRINT is required for LIVE receipt tests.").toMatch(/^[a-f0-9]{64}$/);
    const response = await api.get(
        `account-books/${accountBookId}/transactions/receipt-runtime-preflight`,
        { headers: { Authorization: authorization } },
    );
    expect(response.status(), "BE must reach the expected AI runtime before any receipt upload.").toBe(200);
    const envelope = await response.json() as { body: ReceiptRuntimeIdentity };
    expect(envelope.body.runId).toBe(expectedRunId);
    expect(envelope.body.sourceFingerprint).toBe(expectedFingerprint);
    expect(envelope.body.processId).toBeGreaterThan(0);
    expect(envelope.body.startedAt).toBeTruthy();
    expect(envelope.body.workingDirectory).toBeTruthy();
    return envelope.body;
}

export function expectSameReceiptRuntime(
    expected: ReceiptRuntimeIdentity,
    actual: ReceiptRuntimeIdentity | null | undefined,
): void {
    expect(actual, "analysis must report its process-start runtime identity").toBeTruthy();
    expect(actual!.runId).toBe(expected.runId);
    expect(actual!.sourceFingerprint).toBe(expected.sourceFingerprint);
    expect(actual!.processId).toBe(expected.processId);
    expect(actual!.startedAt).toBe(expected.startedAt);
}
