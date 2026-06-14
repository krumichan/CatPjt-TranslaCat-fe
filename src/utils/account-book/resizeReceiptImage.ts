type ResizeReceiptImageOptions = {
    maxWidth?: number;
    quality?: number;
    maxSize?: number;
};

const DEFAULT_MAX_WIDTH = 1400;
const DEFAULT_QUALITY = 0.82;
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024;

export async function resizeReceiptImage(
    file: File,
    options: ResizeReceiptImageOptions = {}
): Promise<File> {
    const maxWidth = options.maxWidth ?? DEFAULT_MAX_WIDTH;
    const quality = options.quality ?? DEFAULT_QUALITY;
    const maxSize = options.maxSize ?? DEFAULT_MAX_SIZE;

    if (!file.type.startsWith("image/")) {
        return file;
    }

    const image = await loadImage(file);

    const scale = Math.min(1, maxWidth / image.width);
    const width = Math.round(image.width * scale);
    const height = Math.round(image.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) {
        return file;
    }

    context.drawImage(image, 0, 0, width, height);

    const blob = await canvasToBlob(canvas, "image/jpeg", quality);

    if (!blob) {
        return file;
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