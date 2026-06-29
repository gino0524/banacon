"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import useSWR from "swr";

// 6장 공통 레이아웃: 모바일 하단 탭바(캘린더/새 일정/알림/나) + 알림 안읽음 배지.
const POLL_MS = 5000;

const fetcher = async (url: string): Promise<{ unread: number }> => {
  const res = await fetch(url);
  if (!res.ok) return { unread: 0 };
  return res.json();
};

const TABS = [
  { href: "/calendar", label: "캘린더" },
  { href: "/events/new", label: "새 일정" },
  { href: "/notifications", label: "알림" },
  { href: "/me", label: "나" },
];

export default function TabBar() {
  const pathname = usePathname();
  const { data } = useSWR("/api/notifications/unread-count", fetcher, {
    refreshInterval: POLL_MS,
  });
  const unread = data?.unread ?? 0;

  // 로그인 전 화면에는 탭바를 숨긴다(`/`는 proxy가 즉시 리다이렉트).
  if (pathname === "/login" || pathname === "/") return null;

  return (
    <nav className="sticky bottom-0 z-10 grid grid-cols-4 border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)]">
      {TABS.map((t) => {
        const active =
          pathname === t.href || pathname.startsWith(`${t.href}/`);
        const isNotifications = t.href === "/notifications";
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`relative flex items-center justify-center py-3 text-sm font-medium ${
              active ? "text-zinc-900" : "text-zinc-400"
            }`}
          >
            {t.label}
            {isNotifications && unread > 0 && (
              <span className="absolute right-1/2 top-1.5 translate-x-5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
