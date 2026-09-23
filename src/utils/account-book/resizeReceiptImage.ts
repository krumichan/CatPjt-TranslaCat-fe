import { getReceiptImageDimensions, RECEIPT_IMAGE_MAX_EDGE } from "./receiptImageDimensions";
import { normalizeReceiptImageFileName } from "./receiptImageFileName";

type ResizeReceiptImageOptions = {
    maxEdge?: number;
    quality?: number;
    maxSize?: number;
};

const DEFAULT_QUALITY = 0.9;
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024;

export async function resizeReceiptImage(
    file: File,
    options: ResizeReceiptImageOptions = {}
): Promise<File> {
    const maxEdge = options.maxEdge ?? RECEIPT_IMAGE_MAX_EDGE;
    const quality = options.quality ?? DEFAULT_QUALITY;
    const maxSize = options.maxSize ?? DEFAULT_MAX_SIZE;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        throw new Error("Unsupported receipt image format.");
    }

    const image = await loadImage(file);

    // A multi-receipt photo can contain several narrow columns of small print.
    // If the original already satisfies the transport limit, preserve every source
    // pixel instead of applying the OCR fallback's 2400px edge limit in the browser.
    // The AI service still enforces the same byte limit and validates the image.
    if (file.size <= maxSize) {
        const name = normalizeReceiptImageFileName(file.name, file.type);
        return name === file.name ? file : new File([file], name, { type: file.type, lastModified: file.lastModified });
    }

    const { width, height } = getReceiptImageDimensions(image.naturalWidth, image.naturalHeight, maxEdge);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) {
        throw new Error("Failed to prepare receipt image.");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const blob = await canvasToBlob(canvas, "image/jpeg", quality);

    if (!blob) {
        throw new Error("Failed to prepare receipt image.");
    }

    if (blob.size > maxSize) {
        const lowerQualityBlob = await canvasToBlob(canvas, "image/jpeg", 0.65);

        if (lowerQualityBlob) {
            return toReceiptImageFile(file, lowerQualityBlob);
        }
    }

    return toReceiptImageFile(file, blob);
}

function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        const objectUrl = URL.createObjectURL(file);

        image.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(image);
        };

        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("Failed to load receipt image."));
        };

        image.src = objectUrl;
    });
}

function canvasToBlob(
    canvas: HTMLCanvasElement,
    type: string,
    quality: number
): Promise<Blob | null> {
    return new Promise((resolve) => {
        canvas.toBlob(resolve, type, quality);
    });
}

function toReceiptImageFile(originalFile: File, blob: Blob): File {
    const filename = originalFile.name.replace(/\.[^.]+$/, "") || "receipt";

    return new File([blob], `${filename}.jpg`, {
        type: "image/jpeg",
        lastModified: Date.now(),
    });
}
