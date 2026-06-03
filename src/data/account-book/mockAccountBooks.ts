import { AccountBookCategory } from "@/types/accountBook";

export const mockCategories: AccountBookCategory[] = [
    {
        id: "personal",
        name: "개인",
        accountBooks: [
            {
                id: "ab-001",
                name: "일본 생활비",
                description: "월세, 식비, 교통비 관리",
                currencyCode: "JPY",
                incomeAmount: 300000,
                expenseAmount: 172000,
                balance: 128000,
                transactionCount: 34,
            },
            {
                id: "ab-002",
                name: "한국 계좌 관리",
                description: "한국 카드 및 송금 내역",
                currencyCode: "KRW",
                incomeAmount: 1500000,
                expenseAmount: 550000,
                balance: 950000,
                transactionCount: 12,
            },
        ],
    },
    {
        id: "shared",
        name: "공유",
        accountBooks: [
            {
                id: "ab-003",
                name: "친구 여행 정산",
                description: "여행 경비 공동 정산",
                currencyCode: "JPY",
                incomeAmount: 100000,
                expenseAmount: 58000,
                balance: 42000,
                transactionCount: 18,
            },
        ],
    },
];