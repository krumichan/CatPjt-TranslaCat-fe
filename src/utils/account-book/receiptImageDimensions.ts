export const RECEIPT_IMAGE_MAX_EDGE = 2400;

export function getReceiptImageDimensions(width: number, height: number, maxEdge = RECEIPT_IMAGE_MAX_EDGE) {
    if (![width, height, maxEdge].every((value) => Number.isFinite(value) && value > 0)) {
        throw new Error("Invalid receipt image dimensions.");
    }
    const scale = Math.min(1, maxEdge / Math.max(width, height));
    return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}
