"use client";

import { useRef, useState, useTransition } from "react";
import useSWR from "swr";
import {
  addComment,
  setAttendance,
  type AttendanceStatusValue,
} from "@/app/actions";
import type { EventComment, EventLiveData, RosterUser } from "./types";

// 9장: 폴링으로 댓글·참석을 수 초 내 라이브 갱신(SWR refreshInterval).
const POLL_MS = 4000;
const MAX_COMMENT = 1000;

const fetcher = async (url: string): Promise<EventLiveData> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("불러오기 실패");
  return res.json();
};

// 10장: 표시는 KST 고정.
function fmtKstTime(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function NameChip({ user }: { user: RosterUser }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-sm">
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: user.avatarColor ?? "#a1a1aa" }}
      />
      {user.name}
    </span>
  );
}

function RosterSection({ label, users }: { label: string; users: RosterUser[] }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium text-zinc-600">
        {label} {users.length}
      </h3>
      {users.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {users.map((u) => (
            <NameChip key={u.name} user={u} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-zinc-400">없음</p>
      )}
    </div>
  );
}

const TOGGLE_OPTIONS: { value: AttendanceStatusValue; label: string }[] = [
  { value: "going", label: "가는중" },
  { value: "maybe", label: "미정" },
  { value: "not_going", label: "불참" },
];

export default function EventLive({
  eventId,
  initial,
}: {
  eventId: string;
  initial: EventLiveData;
}) {
  const { data, mutate } = useSWR(`/api/events/${eventId}`, fetcher, {
    fallbackData: initial,
    refreshInterval: POLL_MS,
  });
  const live = data ?? initial;

  const [pendingStatus, startStatus] = useTransition();
  const [body, setBody] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function changeStatus(status: AttendanceStatusValue) {
    startStatus(async () => {
      await setAttendance(eventId, status);
      mutate();
    });
  }

  function submitComment(formData: FormData) {
    const value = String(formData.get("body") ?? "");
    startSubmit(async () => {
      const res = await addComment(eventId, value);
      if (res.error) {
        setCommentError(res.error);
        return;
      }
      setCommentError(null);
      setBody("");
      formRef.current?.reset();
      mutate();
    });
  }

  return (
    <>
      <section className="mt-8 flex flex-col gap-3">
        <h2 className="text-sm font-semibold">내 참석 상태</h2>
        <div className="grid grid-cols-3 gap-2">
          {TOGGLE_OPTIONS.map((o) => {
            const active = o.value === live.myStatus;
            return (
              <button
                key={o.value}
                type="button"
                disabled={pendingStatus}
                onClick={() => changeStatus(o.value)}
                className={`rounded-lg border px-2 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                  active
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-500"
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-8 flex flex-col gap-5">
        <h2 className="text-sm font-semibold">참석 명단</h2>
        <RosterSection label="가는중" users={live.roster.going} />
        <RosterSection label="미정" users={live.roster.maybe} />
        <RosterSection label="불참" users={live.roster.notGoing} />
        <RosterSection label="미응답" users={live.roster.noResponse} />
      </section>

      <section className="mt-8 flex flex-col gap-4">
        <h2 className="text-sm font-semibold">
          댓글 {live.comments.length}
        </h2>

        <ul className="flex flex-col gap-3">
          {live.comments.map((c: EventComment) => (
            <li key={c.id} className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: c.avatarColor ?? "#a1a1aa" }}
                />
                <span className="font-medium text-zinc-700">
                  {c.authorName}
                </span>
                <span>· {fmtKstTime(c.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap break-words text-sm text-zinc-800">
                {c.body}
              </p>
            </li>
          ))}
          {live.comments.length === 0 && (
            <li className="text-sm text-zinc-400">아직 댓글이 없습니다.</li>
          )}
        </ul>

        <form ref={formRef} action={submitComment} className="flex flex-col gap-2">
          <textarea
            name="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={MAX_COMMENT}
            rows={3}
            placeholder="댓글을 입력하세요"
            className="w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">
              {body.length}/{MAX_COMMENT}
            </span>
            <button
              type="submit"
              disabled={submitting || body.trim().length === 0}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              등록
            </button>
          </div>
          {commentError && (
            <p className="text-sm text-red-600">{commentError}</p>
          )}
        </form>
      </section>
    </>
  );
}
