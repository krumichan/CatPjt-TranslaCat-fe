export interface DeletionReceipt {
    operationId: string;
    receiptSecret: string;
    expectedPublicId: string;
    returnScheme?: "translacat-dev" | "translacat-preview" | "translacat";
    submitted?: boolean;
}

export interface DeletionStatus {
    operationId: string;
    status: "PENDING" | "COMPLETED";
    requestedAtUtc: string;
    completedAtUtc: string | null;
    receiptExpiresAtUtc: string | null;
}

export const DELETION_RECEIPT_KEY = "translacat.account-deletion.receipt.v1";
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const RECEIPT_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function parseDeletionReceipt(value: unknown): DeletionReceipt {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_DELETION_RECEIPT");
    const dto = value as Record<string, unknown>;
    if (typeof dto.operationId !== "string" || !UUID_PATTERN.test(dto.operationId)
        || typeof dto.receiptSecret !== "string" || !RECEIPT_PATTERN.test(dto.receiptSecret)
        || typeof dto.expectedPublicId !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(dto.expectedPublicId)
        || (dto.returnScheme !== undefined && !["translacat-dev", "translacat-preview", "translacat"].includes(String(dto.returnScheme)))
        || (dto.submitted !== undefined && typeof dto.submitted !== "boolean")) throw new Error("INVALID_DELETION_RECEIPT");
    return {
        operationId: dto.operationId, receiptSecret: dto.receiptSecret, expectedPublicId: dto.expectedPublicId,
        ...(dto.returnScheme ? { returnScheme: dto.returnScheme as DeletionReceipt["returnScheme"] } : {}),
        ...(dto.submitted === true ? { submitted: true } : {}),
    };
}

export function parseDeletionStatus(value: unknown, operationId: string): DeletionStatus {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_DELETION_STATUS");
    const dto = value as Record<string, unknown>;
    const timestamp = (item: unknown): item is string => typeof item === "string" && Number.isFinite(Date.parse(item));
    if (dto.operationId !== operationId || !["PENDING", "COMPLETED"].includes(String(dto.status))
        || !timestamp(dto.requestedAtUtc)
        || (dto.completedAtUtc !== null && !timestamp(dto.completedAtUtc))
        || (dto.receiptExpiresAtUtc !== null && !timestamp(dto.receiptExpiresAtUtc))
        || (dto.status === "COMPLETED" && (dto.completedAtUtc === null || dto.receiptExpiresAtUtc === null))) {
        throw new Error("INVALID_DELETION_STATUS");
    }
    return dto as unknown as DeletionStatus;
}

export function deletionCallback(receipt: DeletionReceipt): string | null {
    // 앱 callback에는 조회 영수증이나 인증 증명을 포함하지 않는다.
    return receipt.returnScheme ? `${receipt.returnScheme}://account-deletion?operationId=${encodeURIComponent(receipt.operationId)}` : null;
}

export function newDeletionReceipt(publicId: string): DeletionReceipt {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const secret = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    return parseDeletionReceipt({ operationId: crypto.randomUUID(), receiptSecret: secret, expectedPublicId: publicId });
}

export function captureDeletionReceipt(storage: Pick<Storage, "getItem" | "setItem">, fragment: string): DeletionReceipt | null {
    // fragment는 서버에 전송되지 않는다. 화면에서 즉시 URL을 지운 뒤 동일 탭의 저장소에만 보존한다.
    const saved = storage.getItem(DELETION_RECEIPT_KEY);
    const previous = saved ? parseDeletionReceipt(JSON.parse(saved)) : null;
    if (fragment) {
        const params = new URLSearchParams(fragment.replace(/^#/, ""));
        if ([...params.keys()].some(key => !["operationId", "receiptSecret", "expectedPublicId", "returnScheme"].includes(key))
            || [...params.keys()].some(key => params.getAll(key).length !== 1)) throw new Error("INVALID_DELETION_RECEIPT");
        const incoming = parseDeletionReceipt(Object.fromEntries(params));
        if (previous?.submitted && (previous.operationId !== incoming.operationId
            || previous.receiptSecret !== incoming.receiptSecret || previous.expectedPublicId !== incoming.expectedPublicId
            || previous.returnScheme !== incoming.returnScheme)) throw new Error("DELETION_RECEIPT_CONFLICT");
        // 같은 앱 요청을 다시 열어도 이미 전송한 표시를 지워 자동 재접수 가능 상태로 바꾸지 않는다.
        const receipt = previous?.submitted ? { ...incoming, submitted: true } : incoming;
        storage.setItem(DELETION_RECEIPT_KEY, JSON.stringify(receipt));
        return receipt;
    }
    return previous;
}
