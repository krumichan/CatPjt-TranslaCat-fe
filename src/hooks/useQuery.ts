import useSWR, {SWRConfiguration} from "swr";

interface UseQueryProps<T, P extends readonly unknown[]> {
    keys: P | undefined | null;
    fetcher: (...args: [...P]) => Promise<T>;
    config?: SWRConfiguration;
    enabled?: boolean;
}

export function useQuery<T, P  extends readonly unknown[]>({
    keys,
    fetcher,
    config,
    enabled = true
}: UseQueryProps<T, P>) {

    // 1. 유효성 검사 (P가 배열이므로 every 사용 가능)
    const isValid = !!keys && enabled && keys.every(key =>
        key !== undefined && key !== null && (key as unknown) !== ""
    );

    const swrKey = isValid ? keys : null;

    const { data, error, isLoading, mutate: swrMutate } = useSWR<T>(
        swrKey,
        // 2. keys가 유효할 때만 실행됨을 보장
        () => {
            if (!keys) throw new Error("Keys are required");
            return fetcher(...(keys as unknown as P));
        },
        {
            revalidateIfStale: false,
            revalidateOnFocus: false,
            shouldRetryOnError: true,
            errorRetryCount: 3,
            ...config
        }
    );

    const mutate = async (
        data?: T | ((currentData: T | undefined) => T | undefined),
        shouldRevalidate: boolean = true // 기본값은 서버 재요청
    ) => {
        return await swrMutate(data, {
            revalidate: shouldRevalidate,
            rollbackOnError: true,
        });
    };

    return {
        data,
        isLoading,
        isError: error,
        mutate
    };
}