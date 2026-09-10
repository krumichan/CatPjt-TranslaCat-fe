export function toNullableText(value?: string | null) {
    return value?.trim() || null;
}

export function normalizeCandidateName(value: string) {
    return value.trim().toLowerCase().replace(/\s+/g, " ");
}