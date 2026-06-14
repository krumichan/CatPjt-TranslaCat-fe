import { AccountBookFixedCost } from "@/types/accountBook";

export function sortFixedCosts(fixedCosts: AccountBookFixedCost[]) {
    return [...fixedCosts].sort((a, b) => {
        if (a.active !== b.active) {
            return a.active ? -1 : 1;
        }

        if (a.paymentDay !== b.paymentDay) {
            return a.paymentDay - b.paymentDay;
        }

        return b.id - a.id;
    });
}
