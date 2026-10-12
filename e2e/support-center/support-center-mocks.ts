import type { Page, Route } from "@playwright/test";

import {
    fulfillApiJson,
    mockCommonPageDependencies,
    mockIdleWebSocket,
} from "../support/api-mocks";
import { responseDto } from "../support/mock-data";
import { TEST_USERS } from "../support/test-users";

const CREATED_AT = "2026-10-11T09:00:00";
const UPDATED_AT = "2026-10-11T09:30:00";

type SupportUser = {
    id: number;
    name: string;
    email: string;
    publicId: string;
};

type MockReply = {
    id: number;
    parentId: number | null;
    content: string;
    authorRole: "ADMIN" | "USER";
    authorName: string;
    createdAt: string;
};

type MockInquiry = {
    id: number;
    title: string;
    content: string;
    category: string;
    status: string;
    user: SupportUser;
    replyCount: number;
    replies: MockReply[];
    unread: boolean;
    relatedMessageId: number | null;
    createdAt: string;
    updatedAt: string;
};

type MockNotice = {
    id: number;
    title: string;
    content: string;
    noticeType: "NORMAL" | "URGENT";
    authorName: string;
    createdAt: string;
    updatedAt: string;
};

type MockMessage = {
    id: number;
    title: string;
    content: string;
    senderName: string;
    recipient: SupportUser;
    createdAt: string;
    readAt: string | null;
};

type MockNotification = {
    id: number;
    type: string;
    title: string;
    targetType: "INQUIRY" | "NOTICE" | "MESSAGE";
    targetId: number;
    replyId: number | null;
    isRead: boolean;
    readAt: string | null;
    createdAt: string;
};

type Mutation = {
    method: string;
    path: string;
    body: Record<string, unknown>;
};

const customer: SupportUser = {
    id: TEST_USERS.A.userId,
    name: TEST_USERS.A.nickname,
    email: TEST_USERS.A.email,
    publicId: TEST_USERS.A.publicId,
};

export const SUPPORT_RECIPIENT: SupportUser = {
    id: TEST_USERS.B.userId,
    name: TEST_USERS.B.nickname,
    email: TEST_USERS.B.email,
    publicId: TEST_USERS.B.publicId,
};

export async function mockSupportCenter(
    page: Page,
    {
        role = "USER",
        withReplyNotification = false,
    }: {
        role?: "USER" | "ADMIN";
        withReplyNotification?: boolean;
    } = {},
) {
    // 준비: 공통 세션과 다른 메뉴의 배경 요청을 고정한다.
    await mockCommonPageDependencies(page, TEST_USERS.A, role);
    await mockIdleWebSocket(page);

    const state = {
        inquiries: [
            {
                id: 11,
                title: "번역 결과 저장 문의",
                content: "번역한 문장을 다시 확인하고 싶습니다.",
                category: "TRANSLATION",
                status: "ANSWERED",
                user: customer,
                replyCount: 1,
                replies: [
                    {
                        id: 101,
                        parentId: null,
                        content: "최근 활동에서 번역 기록을 확인해 주세요.",
                        authorRole: "ADMIN",
                        authorName: "운영팀",
                        createdAt: UPDATED_AT,
                    },
                ],
                unread: withReplyNotification,
                relatedMessageId: null,
                createdAt: CREATED_AT,
                updatedAt: UPDATED_AT,
            },
        ] as MockInquiry[],
        notices: [
            {
                id: 21,
                title: "고객센터 이용 안내",
                content: "문의는 고객센터에서 작성할 수 있습니다.",
                noticeType: "NORMAL",
                authorName: "운영팀",
                createdAt: CREATED_AT,
                updatedAt: CREATED_AT,
            },
        ] as MockNotice[],
        messages: [
            {
                id: 31,
                title: "계정 확인 안내",
                content: "계정 설정을 확인해 주세요. 궁금한 점은 문의해 주세요.",
                senderName: "운영팀",
                recipient: customer,
                createdAt: CREATED_AT,
                readAt: null,
            },
        ] as MockMessage[],
        notifications: (withReplyNotification
            ? [
                  {
                      id: 301,
                      type: "SUPPORT_REPLY",
                      title: "번역 결과 저장 문의에 답변이 등록되었습니다.",
                      targetType: "INQUIRY",
                      targetId: 11,
                      replyId: 101,
                      isRead: false,
                      readAt: null,
                      createdAt: UPDATED_AT,
                  },
              ]
            : []) as MockNotification[],
        mutations: [] as Mutation[],
        unexpectedRequests: [] as string[],
        recipientQueries: [] as string[],
    };

    const markTargetRead = (targetType: string, targetId: number) => {
        for (const notification of state.notifications) {
            if (notification.targetType === targetType && notification.targetId === targetId) {
                notification.isRead = true;
                notification.readAt = UPDATED_AT;
            }
        }
    };

    const reply = (route: Route, body: unknown) =>
        fulfillApiJson(route, responseDto(body));

    await page.route(/\/support\/(?:inquiries|notices|messages|recipients|notifications)(?:[/?]|$)/, async (route) => {
        // 요청 계약을 기록하여 화면 표시와 실제 전송 값을 함께 검증한다.
        const request = route.request();
        const url = new URL(request.url());
        const path = url.pathname.slice(url.pathname.lastIndexOf("/support/"));
        const method = request.method();
        const body = request.postDataJSON() as Record<string, unknown> | null;

        if (method !== "GET") {
            state.mutations.push({ method, path, body: body ?? {} });
        }

        const paged = <T>(items: T[]) => {
            const pageNumber = Number(url.searchParams.get("page") ?? 0);
            const size = Number(url.searchParams.get("size") ?? 20);

            return {
                items: items.slice(pageNumber * size, (pageNumber + 1) * size),
                page: pageNumber,
                size,
                totalElements: items.length,
                totalPages: Math.ceil(items.length / size),
            };
        };

        // 조회 후 읽음 처리와 알림 합계를 같은 상태에 반영한다.
        if (path === "/support/notifications/unread-count") {
            return reply(route, { count: state.notifications.filter((item) => !item.isRead).length });
        }

        if (path === "/support/notifications" && method === "GET") {
            const onlyUnread = url.searchParams.get("unreadOnly") === "true";
            return reply(route, paged(state.notifications.filter((item) => !onlyUnread || !item.isRead)));
        }

        if (path === "/support/notifications/read-all" && method === "PATCH") {
            state.notifications.forEach((item) => {
                item.isRead = true;
                item.readAt = UPDATED_AT;
            });

            return reply(route, true);
        }

        const notificationMatch = path.match(/^\/support\/notifications\/(\d+)\/read$/);
        if (notificationMatch && method === "PATCH") {
            const item = state.notifications.find((notification) => notification.id === Number(notificationMatch[1]));
            if (item) {
                item.isRead = true;
                item.readAt = UPDATED_AT;
            }

            return reply(route, true);
        }

        if (path === "/support/recipients" && method === "GET") {
            state.recipientQueries.push(url.searchParams.get("query") ?? "");
            return reply(route, [SUPPORT_RECIPIENT]);
        }

        // 문의 목록, 본문과 답변은 실제 API의 상태 전이에 맞춰 갱신한다.
        if (path === "/support/inquiries" && method === "GET") {
            const status = url.searchParams.get("status");
            return reply(route, paged(state.inquiries.filter((item) => !status || item.status === status)));
        }

        if (path === "/support/inquiries" && method === "POST" && body) {
            const inquiry: MockInquiry = {
                id: 12 + state.inquiries.length,
                title: String(body.title),
                content: String(body.content),
                category: String(body.category),
                status: "WAITING",
                user: customer,
                replyCount: 0,
                replies: [],
                unread: false,
                relatedMessageId: typeof body.relatedMessageId === "number" ? body.relatedMessageId : null,
                createdAt: UPDATED_AT,
                updatedAt: UPDATED_AT,
            };
            state.inquiries.unshift(inquiry);

            return reply(route, inquiry);
        }

        const inquiryMatch = path.match(/^\/support\/inquiries\/(\d+)(?:\/(replies|status))?$/);
        if (inquiryMatch) {
            const inquiry = state.inquiries.find((item) => item.id === Number(inquiryMatch[1]));
            if (inquiry && method === "GET") {
                inquiry.unread = false;
                markTargetRead("INQUIRY", inquiry.id);
                return reply(route, inquiry);
            }

            if (inquiry && method === "POST" && inquiryMatch[2] === "replies" && body) {
                const addedReply: MockReply = {
                    id: 101 + inquiry.replies.length,
                    parentId: typeof body.parentId === "number" ? body.parentId : null,
                    content: String(body.content),
                    authorRole: role,
                    authorName: role === "ADMIN" ? "운영팀" : customer.name,
                    createdAt: UPDATED_AT,
                };
                inquiry.replies.push(addedReply);
                inquiry.replyCount = inquiry.replies.length;
                inquiry.status = role === "ADMIN" ? "ANSWERED" : "WAITING";

                return reply(route, inquiry);
            }

            if (inquiry && method === "PATCH" && inquiryMatch[2] === "status" && body) {
                inquiry.status = String(body.status);
                return reply(route, inquiry);
            }
        }

        // 공지와 개인 메시지는 작성 결과를 다시 조회할 수 있게 보존한다.
        if (path === "/support/notices/urgent" && method === "GET") {
            return reply(route, []);
        }

        if (path === "/support/notices" && method === "GET") {
            return reply(route, paged(state.notices));
        }

        if (path === "/support/notices" && method === "POST" && body) {
            const notice: MockNotice = {
                id: 22 + state.notices.length,
                title: String(body.title),
                content: String(body.content),
                noticeType: body.noticeType === "URGENT" ? "URGENT" : "NORMAL",
                authorName: "운영팀",
                createdAt: UPDATED_AT,
                updatedAt: UPDATED_AT,
            };
            state.notices.unshift(notice);

            return reply(route, notice);
        }

        const noticeMatch = path.match(/^\/support\/notices\/(\d+)$/);
        if (noticeMatch) {
            const notice = state.notices.find((item) => item.id === Number(noticeMatch[1]));
            if (notice && method === "GET") {
                markTargetRead("NOTICE", notice.id);
                return reply(route, notice);
            }

            if (notice && method === "PUT" && body) {
                Object.assign(notice, body, { updatedAt: UPDATED_AT });
                return reply(route, notice);
            }

            if (notice && method === "DELETE") {
                state.notices = state.notices.filter((item) => item.id !== notice.id);
                return reply(route, true);
            }
        }

        if (path === "/support/messages" && method === "GET") {
            return reply(route, paged(state.messages));
        }

        if (path === "/support/messages" && method === "POST" && body) {
            const message: MockMessage = {
                id: 32 + state.messages.length,
                title: String(body.title),
                content: String(body.content),
                senderName: "운영팀",
                recipient: SUPPORT_RECIPIENT,
                createdAt: UPDATED_AT,
                readAt: null,
            };
            state.messages.unshift(message);

            return reply(route, message);
        }

        const messageMatch = path.match(/^\/support\/messages\/(\d+)$/);
        if (messageMatch && method === "GET") {
            const message = state.messages.find((item) => item.id === Number(messageMatch[1]));
            if (message) {
                if (role !== "ADMIN") {
                    message.readAt = UPDATED_AT;
                }

                markTargetRead("MESSAGE", message.id);
                return reply(route, message);
            }
        }

        state.unexpectedRequests.push(`${method} ${path}`);
        return fulfillApiJson(route, responseDto(null, 501, "고객센터 Mock 계약에 없는 요청입니다."), 501);
    });

    return state;
}
