import type { ResponseDto } from "@/types/common";

export async function parseResponseBody<T>(
    response: Response,
    domainName: string,
): Promise<T> {
    if (!response.ok) {
        throw new Error(`${domainName} API request failed. status=${response.status}`);
    }

    const data = (await response.json()) as ResponseDto<T>;
    return data.body;
}
