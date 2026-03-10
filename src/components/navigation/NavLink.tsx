"use client"

import { Link } from "@/navigation";
import { LucideIcon } from "lucide-react";

interface NavLinkProps {
    href: string;
    icon: LucideIcon;
    label: string;
    onClick?: () => void;
}

export default function NavLink({ href, icon: Icon, label, onClick }: NavLinkProps) {
    return (
        <Link
            href={href}
            className="flex items-center gap-3 px-4 py-2 ..."
            onClick={onClick}
        >
            <Icon size={16} className="text-gray-400 group-hover:text-blue-500 shrink-0" />
            <span className="font-medium">{label}</span>
        </Link>
    );
};
