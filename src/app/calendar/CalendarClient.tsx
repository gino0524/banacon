"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";

// dateKey/time은 서버(KST)에서 계산해 받는다(page.tsx). 클라이언트는 라벨 매칭만 한다.
export type CalEvent = {
  id: string;
  title: string;
  dateKey: string; // "YYYY-MM-DD" (KST 기준 날짜)
  time: string; // "오후 07:00" 등 (KST)
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// "YYYY-MM-DD" → 로컬 Date(자정). 달력 셀은 timezone-agnostic한 날짜 라벨로만 다룬다.
function keyToDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function labelFromKey(key: string): string {
  const d = keyToDate(key);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
}

function EventRow({ e }: { e: CalEvent }) {
  return (
    <Link
      href={`/events/${e.id}`}
      className="flex items-center gap-2.5 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm hover:border-zinc-400"
    >
      <span className="shrink-0 tabular-nums text-zinc-500">{e.time}</span>
      <span className="truncate font-medium">{e.title}</span>
    </Link>
  );
}

export default function CalendarClient({
  events,
  todayKey,
}: {
  events: CalEvent[];
  todayKey: string;
}) {
  const [month, setMonth] = useState<Date>(() =>
    startOfMonth(keyToDate(todayKey)),
  );
  const [selectedKey, setSelectedKey] = useState<string>(todayKey);
  const [agenda, setAgenda] = useState(false); // 모바일 아젠다(목록) 토글

  const byDate = useMemo(() => {
    const m = new Map<string, CalEvent[]>();
    for (const e of events) {
      const list = m.get(e.dateKey);
      if (list) list.push(e);
      else m.set(e.dateKey, [e]);
    }
    return m;
  }, [events]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const selectedEvents = byDate.get(selectedKey) ?? [];

  const monthPrefix = format(month, "yyyy-MM");
  // events는 서버에서 startAt asc 정렬됨 → 필터해도 순서 유지.
  const monthEvents = events.filter((e) => e.dateKey.startsWith(monthPrefix));
  const monthLabel = `${month.getFullYear()}년 ${month.getMonth() + 1}월`;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMonth(addMonths(month, -1))}
            aria-label="이전 달"
            className="rounded-md px-2 py-1 text-lg text-zinc-500 hover:bg-zinc-100"
          >
            ‹
          </button>
          <h1 className="min-w-28 text-center text-lg font-bold tracking-tight">
            {monthLabel}
          </h1>
          <button
            type="button"
            onClick={() => setMonth(addMonths(month, 1))}
            aria-label="다음 달"
            className="rounded-md px-2 py-1 text-lg text-zinc-500 hover:bg-zinc-100"
          >
            ›
          </button>
        </div>
        <button
          type="button"
          onClick={() => setAgenda((a) => !a)}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:border-zinc-500 sm:hidden"
        >
          {agenda ? "달력" : "목록"}
        </button>
      </header>

      {/* 월 그리드 — 모바일 아젠다 모드에서는 숨김, 데스크톱은 항상 표시 */}
      <div className={agenda ? "hidden sm:block" : "block"}>
        <div className="grid grid-cols-7 text-center text-xs font-medium text-zinc-400">
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              className={
                i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : ""
              }
            >
              {w}
            </div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {days.map((d) => {
            const key = format(d, "yyyy-MM-dd");
            const dayEvents = byDate.get(key) ?? [];
            const inMonth = isSameMonth(d, month);
            const isToday = key === todayKey;
            const isSelected = key === selectedKey;
            const weekday = d.getDay();

            const numColor = isSelected
              ? "text-white"
              : !inMonth
                ? "text-zinc-300"
                : weekday === 0
                  ? "text-red-500"
                  : weekday === 6
                    ? "text-blue-500"
                    : "text-zinc-800";

            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedKey(key)}
                className={`flex aspect-square flex-col items-center justify-start gap-1 rounded-md p-1 transition-colors ${
                  isSelected
                    ? "bg-zinc-900"
                    : isToday
                      ? "bg-zinc-100"
                      : "hover:bg-zinc-100"
                }`}
              >
                <span className={`text-sm tabular-nums ${numColor}`}>
                  {d.getDate()}
                </span>
                {dayEvents.length > 0 && (
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isSelected ? "bg-white" : "bg-blue-500"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 선택한 날짜의 일정 목록 — 데스크톱 + 모바일 달력 모드 */}
      <section className={`flex flex-col gap-2 ${agenda ? "hidden sm:flex" : "flex"}`}>
        <h2 className="text-sm font-semibold">{labelFromKey(selectedKey)}</h2>
        {selectedEvents.length > 0 ? (
          selectedEvents.map((e) => <EventRow key={e.id} e={e} />)
        ) : (
          <p className="text-sm text-zinc-400">이 날은 일정이 없어요.</p>
        )}
      </section>

      {/* 모바일 아젠다(이달 전체 목록) — 토글 켜진 모바일에서만 */}
      <section className={agenda ? "flex flex-col gap-3 sm:hidden" : "hidden"}>
        {monthEvents.length > 0 ? (
          monthEvents.map((e, i) => {
            const showDate =
              i === 0 || monthEvents[i - 1].dateKey !== e.dateKey;
            return (
              <div key={e.id} className="flex flex-col gap-2">
                {showDate && (
                  <h2 className="text-sm font-semibold text-zinc-600">
                    {labelFromKey(e.dateKey)}
                  </h2>
                )}
                <EventRow e={e} />
              </div>
            );
          })
        ) : (
          <p className="text-sm text-zinc-400">이번 달 일정이 없어요.</p>
        )}
      </section>
    </div>
  );
}
