
export function normalizeStatus(status: string) {
    if (["PENDING", "EVALUATING", "EVALUATED", "INSUFFICIENT_EVIDENCE", "FAILED"].includes(status)) return status;
    return "OTHER";
}
