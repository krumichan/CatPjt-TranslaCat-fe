import { dispatchApiResponseError } from "@/services/common/apiErrorEvent";
import type { ResponseDto } from "@/types/common";

interface ApiErrorBody {
    errorCode?: string;
    path?: string;
    trace?: string;
}

interface ApiErrorResponseDto {
    resultCode?: number;
    message?: string;
    body?: ApiErrorBody | null;
    guid?: string | null;
    createDate?: string;
}

interface ApiResponseErrorParams {
    status: number;
    domainName: string;
    message?: string | null;
    errorCode?: string | null;
}

export class ApiResponseError extends Error {
    readonly status: number;
    readonly domainName: string;
    readonly errorCode: string | null;
    readonly responseMessage: string | null;

    constructor({
        status,
        domainName,
        message = null,
        errorCode = null,
    }: ApiResponseErrorParams) {
        super(
            errorCode
                ? `${domainName} API request failed. status=${status}, errorCode=${errorCode}`
                : `${domainName} API request failed. status=${status}`,
        );

        this.name = "ApiResponseError";
        this.status = status;
        this.domainName = domainName;
        this.errorCode = errorCode;
        this.responseMessage = message;
    }
}

async function safeJson<T>(response: Response): Promise<T | null> {
    try {
        return (await response.json()) as T;
    } catch {
        return null;
    }
}

export function getApiErrorCode(error: unknown): string | null {
    if (error instanceof ApiResponseError) {
        return error.errorCode;
    }

    return null;
}

export function isApiErrorCode(
    error: unknown,
    errorCode: string,
): boolean {
    return getApiErrorCode(error) === errorCode;
}

export async function parseResponseBody<T>(
    response: Response,
    domainName: string,
): Promise<T> {
    if (!response.ok) {
        const errorResponse = await safeJson<ApiErrorResponseDto>(response);

        const errorCode = errorResponse?.body?.errorCode ?? null;

        dispatchApiResponseError({
            status: response.status,
            domainName,
            errorCode,
            url: response.url,
        });

        throw new ApiResponseError({
            status: response.status,
            domainName,
            message: errorResponse?.message ?? null,
            errorCode,
        });
    }

    const data = await safeJson<ResponseDto<T>>(response);

    if (!data) {
        throw new ApiResponseError({
            status: response.status,
            domainName,
            message: "Response body is empty or invalid JSON.",
            errorCode: "INVALID_RESPONSE_BODY",
        });
    }

    return data.body;
}
