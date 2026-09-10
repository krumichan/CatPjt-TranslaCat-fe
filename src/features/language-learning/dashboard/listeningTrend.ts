
export function latestBy<T extends { date: string }>(items: T[], keyOf: (item: T) => string) {
    const map = new Map<string, T>();
    for (const item of items) {
        const key = keyOf(item);
        const current = map.get(key);
        if (!current || current.date <= item.date) map.set(key, item);
    }
    return map;
}
