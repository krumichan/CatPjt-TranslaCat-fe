import type { FixedCostFormModalProps } from "@/components/account-book/detail/modal/FixedCostFormModal.types";
import { FixedCostFormModalContent } from "@/components/account-book/detail/modal/FixedCostFormModalContent";
import { createPortal } from "react-dom";

export default function FixedCostFormModal(props: FixedCostFormModalProps) {
    const { isOpen, fixedCost } = props;

    if (!isOpen || typeof document === "undefined") {
        return null;
    }

    const formKey = fixedCost ? `edit-${fixedCost.id}` : "create";

    return createPortal(
        <FixedCostFormModalContent key={formKey} {...props} />,
        document.body
    );
}
