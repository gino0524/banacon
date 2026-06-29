"use client";

import { useEffect } from "react";
import { markNotificationsRead } from "@/app/actions";

// F4: 피드를 열면 안읽음 알림을 read 처리한다. 현재 화면의 unread 강조는
// 서버 렌더 시점 상태라 유지되고, 탭바 배지는 다음 폴링에서 비워진다.
export default function NotificationsReader({
  hasUnread,
}: {
  hasUnread: boolean;
}) {
  useEffect(() => {
    if (hasUnread) {
      markNotificationsRead();
    }
  }, [hasUnread]);

  return null;
}
