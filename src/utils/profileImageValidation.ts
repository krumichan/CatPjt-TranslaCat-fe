export type ProfileImageKind = "profile" | "background";

export type ProfileImageValidationErrorCode =
    | "UNSUPPORTED_TYPE"
    | "FILE_TOO_LARGE";

const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);
const ALLOWED_MIME_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
]);

export const PROFILE_IMAGE_ACCEPT =
    "image/jpeg,image/png,image/webp";

export const PROFILE_IMAGE_MAX_BYTES: Record<ProfileImageKind, number> = {
    profile: 5 * 1024 * 1024,
    background: 10 * 1024 * 1024,
};

export function validateProfileImageFile(
    file: File,
    kind: ProfileImageKind,
): ProfileImageValidationErrorCode | null {
    const extension = file.name
        .split(".")
        .pop()
        ?.trim()
        .toLowerCase();

    if (
        !extension ||
        !ALLOWED_EXTENSIONS.has(extension) ||
        (file.type && !ALLOWED_MIME_TYPES.has(file.type))
    ) {
        return "UNSUPPORTED_TYPE";
    }

    if (file.size > PROFILE_IMAGE_MAX_BYTES[kind]) {
        return "FILE_TOO_LARGE";
    }

    return null;
}

export function formatFileSize(bytes: number): string {
    if (bytes < 1024 * 1024) {
        return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
