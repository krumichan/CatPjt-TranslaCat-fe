import CurrencyEditModalContent from "@/components/settings/admin/currency/modal/CurrencyEditModalContent";
import { AdminCurrency, CurrencyUpdateRequest } from "@/types/currency";

type CurrencyEditModalProps = {
    isOpen: boolean;
    currency: AdminCurrency | null;
    isUpdating: boolean;
    onClose: () => void;
    onSubmit: (request: CurrencyUpdateRequest) => void;
};

export default function CurrencyEditModal({
    isOpen,
    currency,
    isUpdating,
    onClose,
    onSubmit,
}: CurrencyEditModalProps) {
    if (!isOpen || !currency) {
        return null;
    }

    return (
        <CurrencyEditModalContent
            key={currency.id}
            currency={currency}
            isUpdating={isUpdating}
            onClose={onClose}
            onSubmit={onSubmit}
        />
    );
}