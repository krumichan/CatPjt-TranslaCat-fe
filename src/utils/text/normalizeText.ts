export function toNullableText(value?: string | null) {
    return value?.trim() || null;
}

export function toRequiredText(value: string, fallbackMessage = "Required value is empty.") {
    const normalizedValue = value.trim();

    if (!normalizedValue) {
        throw new Error(fallbackMessage);
    }

    return normalizedValue;
}

export function normalizeCandidateName(value: string) {
    return value.trim().toLowerCase().replace(/\s+/g, " ");
}