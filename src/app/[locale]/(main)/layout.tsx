import React from "react";
import Header from "@/components/layout/Header";

export default function MainLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative flex flex-col h-screen w-full overflow-hidden">

            <div
                // [수정] bg-layer-instance 클래스 추가, h-[110vh]로 여유 확보
                className="fixed inset-0 -z-10 h-[110vh] bg-[url('/images/translacat_common_background.png')] bg-cover bg-center bg-no-repeat dark:brightness-[0.4] bg-layer-instance"
            />

            <Header/>

            <main className="flex-1 relative overflow-y-auto overflow-x-hidden scrollbar-hide">
                {/* 헤더 뒷공간 레이어 */}
                {/* 헤더 뒷공간을 강제로 메워주는 레이어 */}
                <div className="fixed top-0 left-0 w-full h-[60px] bg-white dark:bg-zinc-900 z-[99] header-filler" />

                {/* [수정] 컨텐츠 영역: padding 대신 transition이 들어간 div로 감싸기 */}
                <div
                    className="transition-transform duration-300 ease-in-out min-h-full"
                    style={{ transform: 'translateY(var(--content-move, 0px))' }}
                >
                    {children}
                </div>
            </main>

            <div id="bottom-ui-portal" className="relative z-[1001]" />
        </div>
    );
}