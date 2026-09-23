import { useRef, useState, type PointerEvent } from "react";
import { normalizedReceiptPoint, type ReceiptRegionPoint } from "@/utils/account-book/receiptRegion";

export function useReceiptSourceRegionPicker() {
    const [start, setStart] = useState<ReceiptRegionPoint | null>(null);
    const [end, setEnd] = useState<ReceiptRegionPoint | null>(null);
    const imageBox = useRef<HTMLDivElement | null>(null);
    const region = start && end ? [
        Math.min(start.x, end.x),
        Math.min(start.y, end.y),
        Math.max(start.x, end.x),
        Math.max(start.y, end.y),
    ] : null;
    const valid = Boolean(region && region[2] - region[0] >= 0.03 && region[3] - region[1] >= 0.03);

    const begin = (event: PointerEvent<HTMLDivElement>) => {
        const point = normalizedReceiptPoint(event.currentTarget.getBoundingClientRect(), event.clientX, event.clientY);
        event.currentTarget.setPointerCapture(event.pointerId);
        setStart(point);
        setEnd(point);
    };

    const move = (event: PointerEvent<HTMLDivElement>) => {
        if (!start)
            return;
        setEnd(normalizedReceiptPoint(event.currentTarget.getBoundingClientRect(), event.clientX, event.clientY));
    };

    const selectFullImage = () => {
        setStart({ x: 0, y: 0 });
        setEnd({ x: 1, y: 1 });
    };

    return {
        imageBox,
        region,
        valid,
        begin,
        move,
        selectFullImage
    };
}
