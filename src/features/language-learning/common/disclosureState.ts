/** Only known boolean keys may override responsive defaults. */
export function resolveDisclosureState<T extends string>(
    defaults: Record<T, boolean>,
    raw: string | null,
): Record<T, boolean> {
    const state = { ...defaults };
    if (raw === null) return state;
    try {
        const saved: unknown = JSON.parse(raw);
        if (saved === null || typeof saved !== "object" || Array.isArray(saved)) return state;
        for (const key of Object.keys(defaults) as T[]) {
            const value = (saved as Record<string, unknown>)[key];
            if (typeof value === "boolean") state[key] = value;
        }
    } catch {
        // Malformed/old storage falls back to this viewport's defaults.
    }
    return state;
}
