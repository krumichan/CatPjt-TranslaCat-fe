import { apiClient } from "@/lib/apiClient";
import { ApiResponseError, parseResponseBody } from "@/services/common/responseParser";
import type { Board, BoardDraft, BoardEntry, BoardLocale, BoardPage } from "@/types/board";

interface UploadStatus {
    id: string;
    partBytes: number;
    completedParts: number[];
    ready: boolean;
}

interface Created {
    id: string;
}

interface SignedUrl {
    url: string;
}

export const BOARD_FILE_LIMIT = 30_000_000;
export const BOARD_R2_LIMIT = 5 * 2 ** 40 - 5 * 2 ** 30;

export function boardService(board: Board, session: string) {
    async function request<T>(path: string, options: RequestInit = {}) {
        const response = await apiClient(`/boards/${board}${path}`, {
            ...options,
            cache: "no-store",
        }, session);

        return parseResponseBody<T>(response, "Board");
    }

    function write<T>(path: string, method: string, body?: BoardDraft | { password: string }) {
        return request<T>(path, { method, body: body && JSON.stringify(body) });
    }

    function pathFor(post: string, reply?: string) {
        return reply ? `/posts/${post}/replies/${reply}` : `/posts/${post}`;
    }

    async function upload(
        file: File,
        previousId: string | undefined,
        signal: AbortSignal,
        remember: (uploadId: string) => void,
        progress: (fraction: number) => void,
    ) {
        // 이미 R2에 올라간 파트는 현재 페이지에서 같은 파일의 전송을 재시도할 때 건너뛴다.
        const upload = previousId
            ? await request<UploadStatus>(`/uploads/${previousId}`, { signal })
            : await request<UploadStatus>("/uploads", {
                method: "POST",
                body: JSON.stringify({ filename: file.name, bytes: file.size }),
                signal,
            });
        remember(upload.id);
        if (upload.ready) {
            progress(1);
            return upload.id;
        }

        const completed = new Set(upload.completedParts);
        const count = Math.ceil(file.size / upload.partBytes);

        // 파일 본문은 조각 단위로 R2에 직접 전송한다. 백엔드 인증 헤더는 R2 요청에 포함하지 않는다.
        for (let number = 1; number <= count; number++) {
            if (!completed.has(number)) {
                const { url } = await request<SignedUrl>(`/uploads/${upload.id}/parts/${number}`, {
                    method: "POST",
                    signal,
                });
                const start = (number - 1) * upload.partBytes;
                const response = await fetch(url, {
                    method: "PUT",
                    body: file.slice(start, start + upload.partBytes),
                    credentials: "omit",
                    referrerPolicy: "no-referrer",
                    signal,
                });
                if (!response.ok) {
                    throw new Error("R2 upload failed");
                }
            }
            progress(number / count);
        }

        // 백엔드가 R2의 실제 크기를 검증한 뒤에만 첨부 ID를 글 작성 화면에 넘긴다.
        const result = await request<Created>(`/uploads/${upload.id}/complete`, { method: "POST", signal });
        return result.id;
    }

    return {
        list: (locale: BoardLocale, page: number) =>
            request<BoardPage>(`/posts?locale=${locale}&page=${page}`),
        post: (id: string, locale: BoardLocale) =>
            request<BoardEntry>(`/posts/${id}?locale=${locale}`),
        replies: (post: string, parent: string | undefined, locale: BoardLocale, page: number) =>
            request<BoardPage>(`/posts/${post}/replies?${new URLSearchParams({
                locale,
                page: String(page),
                ...(parent ? { parent } : {}),
            })}`),
        createPost: (draft: BoardDraft) => write<Created>("/posts", "POST", draft),
        reply: (post: string, parent: string | undefined, draft: BoardDraft) =>
            write<Created>(`/posts/${post}/replies${parent ? `?parent=${parent}` : ""}`, "POST", draft),
        update: (post: string, reply: string | undefined, draft: BoardDraft) =>
            write<Created>(pathFor(post, reply), "PUT", draft),
        remove: (post: string, reply?: string) => write<boolean>(pathFor(post, reply), "DELETE"),
        unlock: (post: string, reply: string | undefined, password: string) =>
            write<boolean>(`${pathFor(post, reply)}/unlock`, "POST", { password }),
        download: (post: string, id: string) => request<SignedUrl>(`/posts/${post}/attachments/${id}`),
        upload,
    };
}

export type BoardApi = ReturnType<typeof boardService>;

export function boardError(error: unknown) {
    if (error instanceof ApiResponseError) {
        switch (error.errorCode) {
            case "BOARD_WRONG_PASSWORD": return "wrongPassword";
            case "BOARD_STORAGE_UNAVAILABLE": return "storageError";
            case "BOARD_INVALID_INPUT": return "invalid";
        }

        if (error.status === 429) return "retryLater";
        if (error.status === 403 || error.status === 404) return "accessError";
    }

    return "error";
}
