export function normalizeReceiptImageFileName(name: string, mimeType: string): string {
    const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[mimeType];
    if (!extension) throw new Error("Unsupported receipt image format.");
    const suffix = name.split(".").at(-1)?.toLowerCase();
    if (name.includes(".") && (suffix === extension || (extension === "jpg" && suffix === "jpeg"))) return name;
    const stem = name.replace(/\.[^.]*$/, "") || "receipt";
    return `${stem}.${extension}`;
}
