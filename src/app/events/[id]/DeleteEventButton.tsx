"use client";

import { useTransition } from "react";
import { deleteEvent } from "@/app/actions";

export default function DeleteEventButton({ eventId }: { eventId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm("이 일정을 삭제할까요? 참석/댓글/알림도 함께 삭제됩니다.")) {
          startTransition(() => deleteEvent(eventId));
        }
      }}
      className="rounded-lg border border-red-300 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
    >
      {pending ? "삭제 중…" : "일정 삭제"}
    </button>
  );
}
