"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAttendance, type AttendanceStatusValue } from "@/app/actions";

const OPTIONS: { value: AttendanceStatusValue; label: string }[] = [
  { value: "going", label: "가는중" },
  { value: "maybe", label: "미정" },
  { value: "not_going", label: "불참" },
];

export default function AttendanceToggle({
  eventId,
  current,
}: {
  eventId: string;
  current: AttendanceStatusValue | null;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="grid grid-cols-3 gap-2">
      {OPTIONS.map((o) => {
        const active = o.value === current;
        return (
          <button
            key={o.value}
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await setAttendance(eventId, o.value);
                router.refresh();
              })
            }
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
  );
}
