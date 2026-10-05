import type { CatalogSnapshot, CatalogSelector } from "@/types/novel/catalog";

export const catalogSelectorKey = (selector: CatalogSelector) => JSON.stringify([selector.kind, selector.period ?? "", selector.genreId ?? "", selector.keyword ?? "", selector.page, selector.language]);

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const integer = (value: unknown) => Number.isSafeInteger(value) && Number(value) >= 0;
const id = (value: unknown): value is string => typeof value === "string" && /^[a-zA-Z0-9_-]{1,160}$/.test(value);
const unit = (value: unknown) => record(value) && typeof value.rawJa === "string" && typeof value.ja === "string"
    && (value.ko === null || typeof value.ko === "string") && [value.rawJa, value.ja, value.ko ?? ""].every(text => String(text).length <= 100_000);

export function parseCatalog(value: unknown): CatalogSnapshot {
    // 서버가 확보한 현재 페이지와 완료 이벤트만 받는다. 배열 인덱스로 rank/ID를 만들지 않는다.
    if (!record(value) || !id(value.snapshotId) || !integer(value.eventSequence) || !integer(value.total) || Number(value.total) > 100
        || !integer(value.ready) || !integer(value.failed) || !["RUNNING", "PARTIAL", "SUCCEEDED", "CANCELLED"].includes(String(value.state))
        || !record(value.selector) || !["RANKING", "SEARCH"].includes(String(value.selector.kind))
        || !["ja", "ko"].includes(String(value.selector.language)) || !integer(value.selector.page) || Number(value.selector.page) < 1
        || !Array.isArray(value.items) || value.items.length > Number(value.total)) throw new Error("INVALID_CATALOG_CONTRACT");
    const ids = new Set();
    const works = new Set();
    let lastArrival = -1;
    let ready = 0;
    let failed = 0;
    for (const item of value.items) {
        if (!record(item) || !id(item.itemId) || !id(item.identifier) || ids.has(item.itemId) || works.has(item.identifier)
            || !(item.rank === null || integer(item.rank)) || !integer(item.sourcePosition)
            || !integer(item.arrivalSequence) || Number(item.arrivalSequence) <= lastArrival
            || !["READY", "FAILED", "PENDING", "RUNNING"].includes(String(item.status)) || !unit(item.title) || !unit(item.author)
            || !unit(item.synopsis) || !unit(item.statusText) || typeof item.isShortStory !== "boolean" || typeof item.cached !== "boolean"
            || !(item.errorCode === null || typeof item.errorCode === "string")) throw new Error("INVALID_CATALOG_ITEM");
        ids.add(item.itemId); works.add(item.identifier); lastArrival = Number(item.arrivalSequence);
        if (item.status === "READY") ready++;
        if (item.status === "FAILED") failed++;
    }
    if (ready !== value.ready || failed !== value.failed || (value.state === "SUCCEEDED" && ready !== value.total)) throw new Error("INVALID_CATALOG_COUNTS");
    return value as unknown as CatalogSnapshot;
}

export function acceptCatalog(previous: CatalogSnapshot, next: CatalogSnapshot) {
    // 한 snapshot의 기존 카드는 위치/원본순위가 고정된다. 실패 카드의 상태 갱신만 같은 자리에 반영한다.
    return previous.snapshotId === next.snapshotId && next.eventSequence >= previous.eventSequence
        && catalogSelectorKey(previous.selector) === catalogSelectorKey(next.selector) && previous.total === next.total
        && previous.items.every((item, index) => {
            const candidate = next.items[index];
            return !!candidate && candidate.itemId === item.itemId && candidate.identifier === item.identifier
                && candidate.rank === item.rank && candidate.sourcePosition === item.sourcePosition && candidate.arrivalSequence === item.arrivalSequence
                && (item.status !== "READY" || (candidate.status === "READY" && ["title", "author", "synopsis", "statusText"].every(key =>
                    JSON.stringify(item[key as "title"]) === JSON.stringify(candidate[key as "title"]))));
        });
}

export function orderedCatalogItems(snapshot: CatalogSnapshot, sort: "arrival" | "source") {
    return sort === "arrival" ? snapshot.items : [...snapshot.items].sort((a, b) => a.sourcePosition - b.sourcePosition);
}
