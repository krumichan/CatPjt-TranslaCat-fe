import {Search} from "lucide-react";

export default function ChatList() {
    return (
        <div className="flex flex-col h-full">
            <header className="p-4 border-b dark:border-zinc-800 bg-white dark:bg-zinc-950 sticky top-0 z-10">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input className="w-full bg-gray-100 dark:bg-zinc-900 rounded-lg py-2 pl-10 pr-4 text-sm" placeholder="会話を検索" />
                </div>
            </header>
            <div className="p-2">
                会話リストのループ
            </div>
        </div>
    );
}