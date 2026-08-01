import { mutate } from "swr";

import { OPEN_CHAT_ROOM_LIST_CACHE_KEY } from "@/constants/openChat";

export async function invalidateOpenChatRoomListCache(): Promise<void> {
    await mutate(
        (key) =>
            Array.isArray(key) &&
            key[0] === OPEN_CHAT_ROOM_LIST_CACHE_KEY,
        undefined,
        { revalidate: true },
    );
}
