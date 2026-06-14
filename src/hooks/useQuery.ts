import useSWR, { Key, SWRConfiguration } from "swr";

export type UseQueryMutate<T> = (
    data?: T | ((currentData: T | undefined) => T | undefined),
    shouldRevalidate?: boolean
) => Promise<T | undefined>;

type MutableTuple<T extends readonly unknown[]> = {
    -readonly [K in keyof T]: T[K];
};

interface UseQueryProps<TData, TKeys extends readonly unknown[]> {
    keys: TKeys | undefined | null;
    fetcher: (...args: MutableTuple<TKeys>) => Promise<TData>;
    config?: SWRConfiguration<TData>;
    enabled?: boolean;
}

export function useQuery<TData, const TKeys extends readonly unknown[]>({
    keys,
    fetcher,
    config,
    enabled = true,
}: UseQueryProps<TData, TKeys>) {
    const isValid =
        !!keys &&
        enabled &&
        keys.every((key) => key !== undefined && key !== null);

    const swrKey: Key = isValid ? keys : null;

    const { data, error, isLoading, mutate: swrMutate } = useSWR<TData>(
        swrKey,
        () => {
            if (!keys) {
                throw new Error("Keys are required");
            }

            return fetcher(...(keys as unknown as MutableTuple<TKeys>));
        },
        {
            revalidateIfStale: false,
            revalidateOnFocus: false,
            shouldRetryOnError: true,
            errorRetryCount: 3,
            ...config,
        }
    );

    const mutate: UseQueryMutate<TData> = async (
        data,
        shouldRevalidate = true
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
        mutate,
    };
}
