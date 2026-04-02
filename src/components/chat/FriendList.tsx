"use client";

import {UserPlus} from "lucide-react";
import {useEffect, useState} from "react";
import {FriendDetail, friendService} from "@/services/chat/friendService";
import SpinLoader from "@/components/common/loader/SpinLoader";

export default function FriendList() {
    const [friends, setFriends] = useState<FriendDetail[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [status, setStatus] = useState<string>("ACCEPTED");

    // 初回マウント時に実行
    useEffect(() => {
        const fetchFriends = async (targetStatus: string) => {
            if (isLoading) {
                return;
            }
            try {
                setIsLoading(true);
                const data = await friendService.getFriends(targetStatus);
                setFriends(data);
            } catch (error) {
                console.error("友達の取得に失敗しました: ", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchFriends(status);
    }, [status]);

    return (
        <div className="flex flex-col h-full">
            <header className="p-4 border-b dark:border-zinc-800 flexjustify-between items-center bg-white dark:bg-zinc-950 sticky top-0 z-10">
                <h1 className="text-xl font-bold">友達</h1>
                <UserPlus className="w-6 h-6 cursor-pointer" />
            </header>

            <div className="flex-1 overflow-y-auto">
                <SpinLoader isLoading={isLoading} size="lg"/>

                <div className="p-4 space-y-4">
                    <p className="text-xs font-bold text-gray-400 uppercase">
                        友達 ({friends.length})
                    </p>

                    {friends.length === 0 ? (
                        <p className="text-center py-10 text-gray-500 text-sm">友達がいません</p>
                    ) : (
                        friends.map((friend) => (
                            <div key={friend.profileId} className="flex items-center gap-4 group cursor-pointer">

                                {/* アイコン */}
                                <div className="w-12 h-12 rounded-2xl bg-gray-200 dark:bg-zinc-800 shrink-0 overflow-hidden">
                                    {friend.iconPath ? (
                                        <img src={friend.iconPath} alt={friend.nickname} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">
                                            {friend.nickname[0]}
                                        </div>
                                    )}
                                </div>

                                {/* 名前とコメント */}
                                <div className="flex-1 border-b dark:border-zinc-900 pb-3 group-last:border-none">
                                    <h3 className="font-bold text-gray-800 dark:text-gray-100">{friend.nickname}</h3>
                                    <p className="text-xs text-gray-500 truncate">{friend.comment}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}