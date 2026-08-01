export const OPEN_CHAT_ROOM_NAME_MAX_LENGTH = 100;
export const OPEN_CHAT_ROOM_DESCRIPTION_MAX_LENGTH = 500;
export const OPEN_CHAT_MIN_MEMBER_COUNT = 2;
export const OPEN_CHAT_DEFAULT_MEMBER_COUNT = 50;
export const OPEN_CHAT_MAX_MEMBER_COUNT = 100;

/**
 * FE #9의 OPEN 목록 SWR key와 공유할 루트 key.
 * 생성 성공 후 이 key를 invalidate하여 목록 Cache가 다음 조회에서 최신화되도록 한다.
 */
export const OPEN_CHAT_ROOM_LIST_CACHE_KEY = "open-chat-room-list";
