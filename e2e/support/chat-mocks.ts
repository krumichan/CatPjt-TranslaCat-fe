import type { Page, Route } from "@playwright/test";

import { fulfillApiJson } from "./api-mocks";
import {
    makeDefaultLanguageSettings,
    makeLanguageSettings,
    makeRoom,
    responseDto,
} from "./mock-data";

type MockChatRoomBaseOptions = {
    room?: ReturnType<typeof makeRoom>;
    messages?: unknown[];
    hasNext?: boolean;
    nextCursorId?: number | null;
    languageSettings?: ReturnType<typeof makeLanguageSettings>;
    defaultLanguageSettings?: ReturnType<typeof makeDefaultLanguageSettings>;
};

function getRoomIdFromPath(url: string, fallbackRoomId: number): number {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\/chat\/rooms\/(\d+)/);
    return match ? Number(match[1]) : fallbackRoomId;
}

function readRequestJson(route: Route): Record<string, unknown> {
    const raw = route.request().postData();

    if (!raw) {
        return {};
    }

    try {
        return JSON.parse(raw) as Record<string, unknown>;
    } catch {
        return {};
    }
}

export async function mockChatLanguageSettings(
    page: Page,
    {
        roomId = 501,
        languageSettings,
        defaultLanguageSettings = makeDefaultLanguageSettings(),
    }: {
        roomId?: number;
        languageSettings?: ReturnType<typeof makeLanguageSettings>;
        defaultLanguageSettings?: ReturnType<typeof makeDefaultLanguageSettings>;
    } = {},
): Promise<void> {
    const roomLanguageSettings =
        languageSettings ?? makeLanguageSettings({ chatRoomId: roomId });

    await page.route(/.*\/users\/me\/chat-language-settings$/, (route) => {
        const method = route.request().method();

        if (method !== "GET" && method !== "PATCH") {
            return route.fallback();
        }

        const body = method === "PATCH" ? readRequestJson(route) : {};

        return fulfillApiJson(
            route,
            responseDto({
                ...defaultLanguageSettings,
                ...body,
            }),
        );
    });

    await page.route(
        /.*\/chat\/rooms\/\d+\/(?:language-settings|members\/me\/language)$/,
        (route) => {
            const method = route.request().method();

            if (method !== "GET" && method !== "PATCH" && method !== "DELETE") {
                return route.fallback();
            }

            const requestedRoomId = getRoomIdFromPath(
                route.request().url(),
                roomId,
            );

            if (method === "DELETE") {
                return fulfillApiJson(
                    route,
                    responseDto({
                        ...roomLanguageSettings,
                        chatRoomId: requestedRoomId,
                        roomLanguageSettingApplied: false,
                        source: "DEFAULT",
                    }),
                );
            }

            const body = method === "PATCH" ? readRequestJson(route) : {};

            return fulfillApiJson(
                route,
                responseDto({
                    ...roomLanguageSettings,
                    chatRoomId: requestedRoomId,
                    source: "ROOM_OVERRIDE",
                    roomLanguageSettingApplied: true,
                    ...body,
                }),
            );
        },
    );
}

export async function mockChatRoomBase(
    page: Page,
    {
        room = makeRoom(),
        messages = [],
        hasNext = false,
        nextCursorId = null,
        languageSettings,
        defaultLanguageSettings = makeDefaultLanguageSettings(),
    }: MockChatRoomBaseOptions = {},
): Promise<void> {
    const roomId = room.id;
    const roomLanguageSettings =
        languageSettings ?? makeLanguageSettings({ chatRoomId: roomId });

    await mockChatLanguageSettings(page, {
        roomId,
        languageSettings: roomLanguageSettings,
        defaultLanguageSettings,
    });

    await page.route(/.*\/chat\/rooms\/\d+$/, (route) => {
        if (route.request().method() !== "GET") {
            return route.fallback();
        }

        const requestedRoomId = getRoomIdFromPath(route.request().url(), roomId);

        return fulfillApiJson(
            route,
            responseDto({
                ...room,
                id: requestedRoomId,
            }),
        );
    });


    await page.route(/.*\/chat\/rooms\/\d+\/read$/, (route) => {
        if (route.request().method() !== "PATCH") {
            return route.fallback();
        }

        const requestedRoomId = getRoomIdFromPath(
            route.request().url(),
            roomId,
        );
        const body = readRequestJson(route);
        const lastReadMessageId =
            typeof body.lastReadMessageId === "number"
                ? body.lastReadMessageId
                : 0;

        return fulfillApiJson(
            route,
            responseDto({
                chatRoomId: requestedRoomId,
                lastReadMessageId,
                lastReadAt: new Date().toISOString(),
                unreadCount: 0,
            }),
        );
    });

    await page.route(/.*\/chat\/rooms\/\d+\/messages(?:\?.*)?$/, (route) => {
        if (route.request().method() !== "GET") {
            return route.fallback();
        }

        return fulfillApiJson(
            route,
            responseDto({
                messages,
                hasNext,
                nextCursorId,
            }),
        );
    });
}
