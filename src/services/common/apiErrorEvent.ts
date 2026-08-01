export const API_RESPONSE_ERROR_EVENT = "translacat:api-response-error";

export interface ApiResponseErrorEventDetail {
    status: number;
    errorCode: string | null;
    domainName: string;
    url: string;
}

export function dispatchApiResponseError(
    detail: ApiResponseErrorEventDetail,
): void {
    if (typeof window === "undefined") {
        return;
    }

    window.dispatchEvent(
        new CustomEvent<ApiResponseErrorEventDetail>(
            API_RESPONSE_ERROR_EVENT,
            { detail },
        ),
    );
}
