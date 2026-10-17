import { useQuery } from "@/hooks/useQuery";
import { accountBookListQueryKeys } from "@/hooks/account-book/list/accountBookListQueryKeys";
import { currencyService } from "@/services/currency/currencyService";

export function useReceiptCurrencyOptions() {
    // 가계부 생성 화면과 같은 지원 통화 캐시를 사용한다. 후보 조회가 사용자의 선택을 바꾸지는 않는다.
    const { data = [], isLoading, isError, mutate } = useQuery({
        keys: accountBookListQueryKeys.currencies(),
        fetcher: () => currencyService.list(),
        config: { dedupingInterval: 5000, shouldRetryOnError: false },
    });

    return {
        currencies: data.filter((currency) => /^[A-Z]{3}$/.test(currency.code)),
        isLoading,
        failed: Boolean(isError),
        retry: () => void mutate().catch(() => undefined),
    };
}
