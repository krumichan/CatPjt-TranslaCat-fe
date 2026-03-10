"use client";

import {usePathname} from "@/navigation";
import UserMenu from "@/components/layout/UserMenu";
import Logo from "@/components/layout/Logo";
import ThemeSwitcher from "@/components/layout/ThemeSwitcher";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";

export default function Header() {
    const pathname = usePathname();
    const isLoginPage = pathname === "/login";

    if (isLoginPage) {
        return null;
    }

    return (
        <header
            // transition만 남기고 나머지는 Tailwind 클래스로 처리
            className={`fixed top-0 left-0 w-full flex items-center justify-between px-8 py-2 
                       bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b 
                       border-gray-200 dark:border-zinc-800 shadow-sm z-100 
                       transition-transform duration-300 ease-in-out
                       header-instance`} // 타겟팅을 위한 클래스 추가
        >
            <Logo/>

            <div className="flex items-center gap-2">
                <ThemeSwitcher/>

                <LanguageSwitcher/>

                {!isLoginPage && <UserMenu />}
            </div>
        </header>
    );
}