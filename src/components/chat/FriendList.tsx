import {UserPlus} from "lucide-react";

export default function FriendList() {
    return (
        <div className="flex flex-col h-full">
            <header className="p-4 border-b dark:border-zinc-800 flexjustify-between items-center bg-white dark:bg-zinc-950 sticky top-0 z-10">
                <h1 className="text-xl font-bold">友達</h1>
                <UserPlus className="w-6 h-6 cursor-pointer" />
            </header>
            <div className="p-4">
                友達リスト
            </div>
        </div>
    );
}