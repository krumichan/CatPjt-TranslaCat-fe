import assert from "node:assert/strict";
import test from "node:test";

import { formatActivityDateTime } from "../src/utils/time/formatActivityDateTime.ts";
import { getRoomTypeTranslationKey, getSourceTypeTranslationKey } from "../src/utils/chat/chatRoomTypeLabel.ts";
import { DIRECT_INPUT_VALUE, STORE_NONE_VALUE, getInitialValues, isEndMonthBeforeStartMonth, isValidYearMonth } from "../src/utils/account-book/fixedCostForm.ts";
import { getDefaultYearMonth } from "../src/utils/account-book/expenseGoalForm.ts";
import { buildPieChartItems } from "../src/utils/account-book/expenseRanking.ts";
import * as websocket from "../src/utils/chat/chatWebSocketParser.ts";
import { getLanguageLearningErrorCode, LANGUAGE_LEARNING_ERROR_CODES } from "../src/features/language-learning/common/errorMapping.ts";
import { ApiResponseError } from "../src/services/common/responseParser.ts";

test("activity date formatting preserves browser locale and timezone options", () => {
    const value = "2026-09-09T12:30:00Z";
    assert.equal(formatActivityDateTime(value), new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)));
});
test("room labels preserve the list namespace and explicitly support the header prefix", () => {
    for (const [value, key] of [["DIRECT", "direct"], ["GROUP", "group"], ["OPEN", "open"], ["FUTURE", "unknown"]]) {
        assert.equal(getRoomTypeTranslationKey(value), `roomType.${key}`);
        assert.equal(`header.${getRoomTypeTranslationKey(value)}`, `header.roomType.${key}`);
    }
    for (const [value, key] of [["FRIEND", "friend"], ["MANUAL", "manual"], ["OPEN", "open"], ["AI", "ai"], ["FUTURE", "unknown"]]) {
        assert.equal(getSourceTypeTranslationKey(value), `sourceType.${key}`);
    }
});
test("fixed-cost and expense-goal month display conventions remain distinct", () => {
    const now = new Date(2026, 8, 9);
    const initial = getInitialValues(null, [], [], now);
    assert.equal(initial.startYear, "2026");
    assert.equal(initial.startMonth, "9");
    assert.equal(initial.storeName, STORE_NONE_VALUE);
    assert.deepEqual(getDefaultYearMonth("ALL", now), { year: "2026", month: "09" });
    assert.deepEqual(getDefaultYearMonth("2025-03", now), { year: "2025", month: "03" });
});
test("fixed-cost validation keeps existing numeric year/month boundaries", () => {
    assert.equal(isValidYearMonth("2000", "1"), true);
    assert.equal(isValidYearMonth("9999", "12"), true);
    for (const [year, month] of [["1999", "12"], ["10000", "1"], ["2026", "0"], ["2026", "13"], ["bad", "1"]]) assert.equal(isValidYearMonth(year, month), false);
    assert.equal(isEndMonthBeforeStartMonth("2026", "1", "2025", "12"), true);
    assert.equal(isEndMonthBeforeStartMonth("2026", "1", "2026", "1"), false);
    assert.equal(isEndMonthBeforeStartMonth("invalid", "1", "2025", "12"), false);
});
test("fixed-cost editing distinguishes saved selections, direct input and no store", () => {
    const item = { title: "rent", storeName: "landlord", category: "housing", amount: 12345, paymentDay: 20, startYear: 2026, startMonth: 9, endYear: null, endMonth: null, memo: null };
    const now = new Date(2026, 8, 9);
    const selected = getInitialValues(item, [{ name: "housing" }], [{ storeName: "landlord" }], now);
    assert.equal(selected.storeName, "landlord");
    assert.equal(selected.category, "housing");
    assert.equal(selected.directStoreName, "");
    assert.equal(selected.amount, "12345");
    const custom = getInitialValues(item, [], [], now);
    assert.equal(custom.storeName, DIRECT_INPUT_VALUE);
    assert.equal(custom.directStoreName, "landlord");
    assert.equal(custom.category, DIRECT_INPUT_VALUE);
    assert.equal(custom.directCategory, "housing");
    assert.equal(custom.endYear, "");
    assert.equal(getInitialValues({ ...item, storeName: null }, [], [], now).storeName, STORE_NONE_VALUE);
});
test("ranking-chart aggregation preserves ordering and computes the other slice", () => {
    const items = [{ name: "a", amount: 60, transactionCount: 3, percentage: 60 }, { name: "b", amount: 25, transactionCount: 2, percentage: 25 }, { name: "c", amount: 15, transactionCount: 1, percentage: 15 }];
    assert.equal(buildPieChartItems(items, 100, 3, "other"), items);
    const grouped = buildPieChartItems(items, 100, 2, "other");
    assert.deepEqual(grouped, [items[0], { name: "other", amount: 40, transactionCount: 3, percentage: 40 }]);
    assert.equal(buildPieChartItems(items, 0, 2, "other")[1].percentage, 0);
    assert.deepEqual(items.map((x) => x.name), ["a", "b", "c"]);
    assert.deepEqual(buildPieChartItems([], 0, 8, "other"), []);
});
test("language-learning error mapping remains limited to ApiResponseError", () => {
    const code = LANGUAGE_LEARNING_ERROR_CODES.EVALUATION_FAILED;
    assert.equal(getLanguageLearningErrorCode(new ApiResponseError({ status: 500, domainName: "test", errorCode: code })), code);
    assert.equal(getLanguageLearningErrorCode(new Error(code)), null);
    assert.equal(getLanguageLearningErrorCode({ errorCode: code }), null);
    assert.equal(getLanguageLearningErrorCode(null), null);
});

const occurredAt = "2026-09-09T00:00:00Z";
const message = { id: 1, chatRoomId: 2, senderUserId: 3, senderAiMemberId: null, senderName: "name", senderEmail: null, senderType: "USER", messageType: "TEXT", content: "hello", status: "SENT", translations: [], createdAt: occurredAt, updatedAt: occurredAt };
const eventCases = [
    ["extractChatMessageFromEvent", message],
    ["extractChatReadUpdatedEvent", { eventType: "chat.read.updated", chatRoomId: 2, userId: 3, lastReadMessageId: 1, lastReadAt: occurredAt, unreadCount: 0, occurredAt }],
    ["extractChatMemberReadUpdatedEvent", { eventType: "chat.member.read.updated", chatRoomId: 2, readerUserId: 3, previousLastReadMessageId: null, lastReadMessageId: 1, readAt: occurredAt, occurredAt }],
    ["extractChatRoomMembersChangedEvent", { eventType: "chat.members.changed", roomId: 2, occurredAt }],
    ["extractOpenChatProfileUpdatedEvent", { eventType: "chat.open-profile.updated", roomId: 2, openChatMemberId: 3, memberCode: "member-3", nickname: "nick", profileImageUrl: null, role: "MEMBER", occurredAt }],
    ["extractOpenChatMemberRoleUpdatedEvent", { eventType: "chat.member.role.updated", roomId: 2, targetOpenChatMemberId: 3, role: "ADMIN", occurredAt }],
    ["extractOpenChatMemberBannedEvent", { eventType: "chat.member.banned", roomId: 2, targetOpenChatMemberId: 3, reason: "reason", bannedAt: occurredAt, occurredAt }],
    ["extractOpenChatRoomClosedEvent", { eventType: "chat.room.closed", roomId: 2, closedAt: occurredAt, occurredAt }],
    ["extractChatPresenceChangedEvent", { eventType: "chat.presence.changed", roomId: 2, roomType: "OPEN", memberRef: "member-3", online: true, occurredAt }],
];
for (const [name, value] of eventCases) {
    test(`${name} supports wrapper variants and ignores invalid candidates`, () => {
        const parse = websocket[name];
        assert.equal(parse(value), value);
        for (const wrapper of ["payload", "data", "message"]) assert.equal(parse({ [wrapper]: value }), value);
        assert.equal(parse({ payload: [], data: value }), value);
        assert.equal(parse({ payload: {}, data: [], message: null }), null);
        const second = { ...value };
        assert.equal(parse({ payload: value, data: second }), value);
    });
}
test("websocket event type retains eventType-before-type precedence", () => {
    assert.equal(websocket.getChatWebSocketEventType({ eventType: "chat.read.updated", type: "chat.message.created" }), "chat.read.updated");
    assert.equal(websocket.getChatWebSocketEventType({ type: "chat.message.created" }), "chat.message.created");
    assert.equal(websocket.getChatWebSocketEventType({}), null);
});
test("open-chat sender validation rejects invalid roles and preserves nullable image data", () => {
    const sender = { openChatMemberId: 3, memberCode: "m3", nickname: "nick", profileImageUrl: null, role: "MEMBER" };
    const valid = { ...message, sender };
    assert.equal(websocket.extractChatMessageFromEvent({ payload: valid }), valid);
    assert.equal(websocket.extractChatMessageFromEvent({ payload: { ...message, sender: { ...sender, role: "INVALID" } } }), null);
});
test("member-read events accept open-member identity but not a missing reader", () => {
    const value = { eventType: "chat.member.read.updated", chatRoomId: 2, readerUserId: null, readerOpenChatMemberId: 3, previousLastReadMessageId: null, lastReadMessageId: 1, readAt: occurredAt, occurredAt };
    assert.equal(websocket.extractChatMemberReadUpdatedEvent(value), value);
    assert.equal(websocket.extractChatMemberReadUpdatedEvent({ ...value, readerOpenChatMemberId: null }), null);
});
test("chat notifications retain their dedicated event type and notification wrapper", () => {
    const notification = { id: 1, notificationType: "CHAT_INVITATION", roomId: 2, payload: {}, isRead: false, readAt: null, createdAt: occurredAt };
    assert.equal(websocket.extractChatNotificationCreatedItem({ eventType: "chat.notification.created", notification }), notification);
    assert.equal(websocket.extractChatNotificationCreatedItem({ eventType: "chat.message.created", notification }), null);
    assert.equal(websocket.extractChatNotificationCreatedItem({ eventType: "chat.notification.created", payload: notification }), null);
    assert.equal(websocket.extractChatNotificationCreatedItem({ type: "chat.notification.created", notification: { ...notification, notificationType: "INVALID" } }), null);
});
test("translation parsing retains nested translation identity and fallback fields", () => {
    const translation = { id: 4, languageCode: "ja", translatedContent: "こんにちは", status: "COMPLETED", failureReason: null, completedAt: occurredAt };
    const nested = websocket.extractTranslationResultFromEvent({ payload: { messageId: 1, translation } }, "FAILED");
    assert.equal(nested.translation, translation);
    const flat = websocket.extractTranslationResultFromEvent({ data: { messageId: 1, translationId: 4, languageCode: "ja", translatedText: "こんにちは", occurredAt } }, "COMPLETED");
    assert.deepEqual(flat, { messageId: 1, translation });
    const failed = websocket.extractTranslationResultFromEvent({ message: { messageId: 1, languageCode: "ja" } }, "FAILED");
    assert.deepEqual(failed, { messageId: 1, translation: { id: 0, languageCode: "ja", translatedContent: null, status: "FAILED", failureReason: null, completedAt: null } });
    assert.equal(websocket.extractTranslationResultFromEvent({ payload: { messageId: "1", languageCode: "ja" } }, "FAILED"), null);
    assert.equal(websocket.extractTranslationResultFromEvent({ payload: { messageId: 1 } }, "FAILED"), null);
});
