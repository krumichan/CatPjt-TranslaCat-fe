type Bounds = { left: number; right: number; top: number; bottom: number };

export function positionReceiptActionMenu(anchor: Bounds, menu: { width: number; height: number }, bounds: Bounds) {
    const gap = 4;
    const below = bounds.bottom - anchor.bottom - gap;
    const above = anchor.top - bounds.top - gap;
    const placement = below < menu.height && above > below ? "top" : "bottom";
    const preferredTop = placement === "top" ? anchor.top - menu.height - gap : anchor.bottom + gap;

    // 하단 action 영역을 피하고, 좁은 화면에서도 메뉴가 가로로 잘리지 않게 한다.
    return {
        placement,
        top: Math.max(bounds.top, Math.min(preferredTop, bounds.bottom - menu.height)),
        left: Math.max(bounds.left, Math.min(anchor.right - menu.width, bounds.right - menu.width)),
    };
}
