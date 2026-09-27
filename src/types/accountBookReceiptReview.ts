export type CategoryOptionsStatus = "loading" | "error" | "empty" | "ready";

export type ReceiptQueueStatus = "queued" | "analyzing" | "success" | "partial" | "failure" | "canceled";

export type ReceiptQueueItem = {
    sourceImageId: string;
    file: File;
    previewUrl: string;
    revision: number;
    status: ReceiptQueueStatus;
    receiptCount: number;
    error: string | null;
};

export type ReceiptSourcePreviewItem = {
    sourceImageId: string;
    previewUrl: string;
    fileName: string;
};

export type ReceiptRowState = "PENDING" | "READY" | "NEEDS_REVIEW";
