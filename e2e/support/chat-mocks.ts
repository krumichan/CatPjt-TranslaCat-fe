import type { Page } from "@playwright/test";
import { fulfillApiJson } from "./api-mocks";
import {
    makeLanguageSettings,
    makeRoom,
    responseDto,
} from "./mock-data";

export async function mockChatRoomBase(
    page: Page,
    {
        room = makeRoom(),
        messages = [],
        hasNext = false,
        nextCursorId = null,
        languageSettings = makeLanguageSettings(),
    }: {
        room?: ReturnType<typeof makeRoom>;
        messages?: unknown[];
        hasNext?: boolean;
        nextCursorId?: number | null;
        languageSettings?: ReturnType<typeof makeLanguageSettings>;
    } = {},
): Promise<void> {
    const roomId = room.id;

    await page.route(new RegExp(`/chat/rooms/${roomId}$`), (route) =>
        fulfillApiJson(route, responseDto(room)),
    );

    await page.route(new RegExp(`/chat/rooms/${roomId}/messages(?:\\?.*)?$`), (route) => {
        if (route.request().method() !== "GET") return route.fallback();
        return fulfillApiJson(
            route,
            responseDto({ messages, hasNext, nextCursorId }),
        );
    });

    await page.route(
        new RegExp(`/chat/rooms/${roomId}/members/me/language$`),
        (route) => fulfillApiJson(route, responseDto(languageSettings)),
    );
}
