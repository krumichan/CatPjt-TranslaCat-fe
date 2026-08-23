import { dispatchApiResponseError } from "@/services/common/apiErrorEvent";
import type { ResponseDto } from "@/types/common";

interface ApiErrorBody {
    // Legacy/common contract
    errorCode?: string;
    path?: string;
    trace?: string;
    // Language Learning Listening structured contract
    code?: string;
    messageKey?: string;
    retryable?: boolean;
    retryAfterSeconds?: number | null;
    retryAfter?: number | null;
    failedStage?: string | null;
    resourceId?: number | null;
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
    messageKey?: string | null;
    retryable?: boolean;
    retryAfterSeconds?: number | null;
    failedStage?: string | null;
    resourceId?: number | null;
}

export class ApiResponseError extends Error {
    readonly status: number;
    readonly domainName: string;
    readonly errorCode: string | null;
    readonly responseMessage: string | null;
    readonly messageKey: string | null;
    readonly retryable: boolean;
    readonly retryAfterSeconds: number | null;
    readonly failedStage: string | null;
    readonly resourceId: number | null;

    constructor({
        status,
        domainName,
        message = null,
        errorCode = null,
        messageKey = null,
        retryable = false,
        retryAfterSeconds = null,
        failedStage = null,
        resourceId = null,
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
        this.messageKey = messageKey;
        this.retryable = retryable;
        this.retryAfterSeconds = retryAfterSeconds;
        this.failedStage = failedStage;
        this.resourceId = resourceId;
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
    return error instanceof ApiResponseError ? error.errorCode : null;
}

export function isApiErrorCode(error: unknown, errorCode: string): boolean {
    return getApiErrorCode(error) === errorCode;
}

export async function parseResponseBody<T>(response: Response, domainName: string): Promise<T> {
    if (!response.ok) {
        const errorResponse = await safeJson<ApiErrorResponseDto>(response);
        const body = errorResponse?.body;
        const errorCode = body?.errorCode ?? body?.code ?? null;

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
            messageKey: body?.messageKey ?? null,
            retryable: body?.retryable ?? false,
            retryAfterSeconds: body?.retryAfterSeconds ?? body?.retryAfter ?? null,
            failedStage: body?.failedStage ?? null,
            resourceId: body?.resourceId ?? null,
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
