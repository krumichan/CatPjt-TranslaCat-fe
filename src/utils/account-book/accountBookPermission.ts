import { AccountBookMemberRole } from "@/types/accountBook";

type AccountBookRoleHolder = {
    myRole?: AccountBookMemberRole | null;
};

export function isAccountBookOwner(
    accountBook?: AccountBookRoleHolder | null
): boolean {
    return accountBook?.myRole === "OWNER";
}

export function canLeaveAccountBook(
    accountBook?: AccountBookRoleHolder | null,
): boolean {
    return accountBook?.myRole === "MEMBER";
}

export function canEditAccountBook(
    accountBook?: AccountBookRoleHolder | null
): boolean {
    return isAccountBookOwner(accountBook);
}

export function canDeleteAccountBook(
    accountBook?: AccountBookRoleHolder | null
): boolean {
    return isAccountBookOwner(accountBook);
}

export function canManageAccountBookMembers(
    accountBook?: AccountBookRoleHolder | null
): boolean {
    return isAccountBookOwner(accountBook);
}