import { novelRequest } from "@/services/novel/novelReaderService";
import { parseCatalog } from "@/features/novel/catalog";
import type { CatalogSelector } from "@/types/novel/catalog";

const base = (platform: string) => {
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(platform)) throw new Error("INVALID_PLATFORM");
    return `/${encodeURIComponent(platform)}/novels/catalog`;
};
export const novelCatalogService = {
    async start(platform: string, selector: CatalogSelector, idempotencyKey: string, signal: AbortSignal, trace: string) {
        return parseCatalog(await novelRequest(base(platform), signal, { ...selector, idempotencyKey }, trace));
    },
    async status(platform: string, snapshotId: string, signal: AbortSignal, trace: string) {
        return parseCatalog(await novelRequest(`${base(platform)}/${encodeURIComponent(snapshotId)}`, signal, undefined, trace));
    },
    async retry(platform: string, snapshotId: string, identifier: string, idempotencyKey: string, signal: AbortSignal, trace: string) {
        return parseCatalog(await novelRequest(`${base(platform)}/${encodeURIComponent(snapshotId)}/items/${encodeURIComponent(identifier)}/retry`, signal, { idempotencyKey }, trace));
    },
    async cancel(platform: string, snapshotId: string) {
        // 화면 구독 해지만 알린다. 다른 화면의 공유 작품 작업 취소 여부는 Novel이 판단한다.
        await novelRequest(`${base(platform)}/${encodeURIComponent(snapshotId)}/cancel`, AbortSignal.timeout(10_000), {}, crypto.randomUUID());
    },
};
