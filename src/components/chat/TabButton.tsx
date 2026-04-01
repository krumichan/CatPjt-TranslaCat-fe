import React, {ReactElement} from "react";

interface TabButtonProps {
    icon: ReactElement;
    label: string;
    active: boolean;
    onClick: () => void;
}

export default function TabButton({ icon, label, active, onClick }: TabButtonProps) {
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center flex-1 transition ${
                active
                    ? 'text-blue-500'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
            }`}
        >
            {React.cloneElement(icon, {
                className: "w-7 h-7"
            } as React.HTMLAttributes<SVGElement>)}

            <span className="text-xs mt-1 font-medium">{label}</span>
        </button>
    );
}