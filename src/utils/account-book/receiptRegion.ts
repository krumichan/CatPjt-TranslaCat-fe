export type ReceiptRegionPoint = {
    x: number;
    y: number;
};

export function normalizedReceiptPoint(rect: Pick<DOMRect, "left" | "top" | "width" | "height">, clientX: number, clientY: number): ReceiptRegionPoint {
    return {
        x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
        y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    };
}
